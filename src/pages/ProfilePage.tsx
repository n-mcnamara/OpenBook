import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { NDKEvent, NDKKind, NDKSubscription } from '@nostr-dev-kit/ndk';
import { useUserProfile } from '../hooks/useUserProfile';
import ndk from '../lib/ndk';
import { useUserStore } from '../lib/store';
import ShelvedBook from '../components/book/ShelvedBook';
import { getSelfShelfKey, decryptShelfItem } from '../lib/shelfCrypto';
import { getFriendShelfKey } from '../lib/ShelfKeyManager';
import eventBus from '../lib/EventBus';
import '../styles/Bookshelf.css';

export default function ProfilePage() {
  const { pubkey } = useParams();
  const { user: currentUser } = useUserStore();
  const [events, setEvents] = useState<NDKEvent[]>([]);
  const [contactListEvent, setContactListEvent] = useState<NDKEvent | null>(null);
  const [followers, setFollowers] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [hasAccess, setHasAccess] = useState(false);

  const profile = useUserProfile(pubkey);

  // Check if we have access to the user's shelf and listen for key events
  useEffect(() => {
    if (!pubkey || !currentUser) return;

    const checkAccess = async () => {
      const key = await getFriendShelfKey(pubkey);
      setHasAccess(!!key);
    };
    checkAccess();

    const handleKeyReceived = (keyOwnerPubkey: string) => {
      if (keyOwnerPubkey === pubkey) {
        setHasAccess(true);
      }
    };

    eventBus.on('key-received', handleKeyReceived);
    return () => {
      eventBus.off('key-received', handleKeyReceived);
    };
  }, [pubkey, currentUser]);

  // Fetch followers and following
  useEffect(() => {
    if (!pubkey) return;

    const followingSub = ndk.subscribe({ kinds: [NDKKind.Contacts], authors: [pubkey] });
    followingSub.on('event', (event: NDKEvent) => {
        const followedPubkeys = event.tags.filter(t => t[0] === 'p').map(t => t[1]);
        setFollowing(new Set(followedPubkeys));
    });

    const followersSub = ndk.subscribe({ kinds: [NDKKind.Contacts], '#p': [pubkey] });
    followersSub.on('event', (event: NDKEvent) => {
        setFollowers(prev => new Set([...prev, event.pubkey]));
    });

    return () => {
        followingSub.stop();
        followersSub.stop();
    }
  }, [pubkey]);

  // Fetch the logged-in user's contact list
  useEffect(() => {
    if (!currentUser) return;
    ndk.fetchEvent({ kinds: [NDKKind.Contacts], authors: [currentUser.pubkey] })
      .then(event => setContactListEvent(event));
  }, [currentUser]);

  const isFollowing = useMemo(() => {
    if (!contactListEvent || !pubkey) return false;
    return contactListEvent.tags.some(tag => tag[0] === 'p' && tag[1] === pubkey);
  }, [contactListEvent, pubkey]);

  // Fetch the profile user's book shelves
  useEffect(() => {
    if (!pubkey) return;
    setEvents([]);

    const isOwnProfile = currentUser?.pubkey === pubkey;
    const kinds = [30451 as NDKKind];
    if (currentUser && (isOwnProfile || hasAccess)) {
      kinds.push(30454 as NDKKind);
    }

    const subscription: NDKSubscription = ndk.subscribe([{ kinds, authors: [pubkey] }]);
    
    subscription.on('event', async (event: NDKEvent) => {
      if (event.kind === 30454) {
        let decrypted = false;
        try {
          let key: CryptoKey | null = null;
          if (isOwnProfile) {
            key = await getSelfShelfKey();
          } else {
            key = await getFriendShelfKey(pubkey);
          }

          if (key) {
            const decryptedContent = await decryptShelfItem(event.content, key);
            const data = JSON.parse(decryptedContent);
            event.content = data.review;
            if (data.rating) event.tags.push(['rating', data.rating.toString()]);
            if (data.cover) event.tags.push(['cover', data.cover]);
            decrypted = true;
          }
        } catch (e) {
          console.error(`Failed to decrypt or parse shelf item (event ${event.id}):`, e);
        }
        if (!decrypted) return;
      }

      setEvents(prevEvents => {
        const existingIndex = prevEvents.findIndex(e => e.tagValue('d') === event.tagValue('d'));
        if (existingIndex > -1) {
          const newEvents = [...prevEvents];
          if ((event.created_at || 0) > (newEvents[existingIndex].created_at || 0)) {
            newEvents[existingIndex] = event;
          }
          return newEvents;
        }
        return [...prevEvents, event];
      });
    });

    subscription.on('eose', () => {});
    return () => subscription.stop();
  }, [pubkey, currentUser, hasAccess]);

  const updateContactList = async (newTags: string[][]) => {
    const newEvent = new NDKEvent(ndk);
    newEvent.kind = NDKKind.Contacts;
    newEvent.tags = newTags;
    newEvent.content = contactListEvent?.content || '';
    await newEvent.publish();
    setContactListEvent(newEvent);
  };

  const handleFollow = () => {
    if (!pubkey) return;
    const currentTags = contactListEvent?.tags || [];
    const newTags = [...currentTags, ['p', pubkey]];
    updateContactList(newTags);
  };

  const handleUnfollow = () => {
    if (!pubkey) return;
    const currentTags = contactListEvent?.tags || [];
    const newTags = currentTags.filter(tag => !(tag[0] === 'p' && tag[1] === pubkey));
    updateContactList(newTags);
  };

  const handleGrantAccess = async () => {
    if (!pubkey || !currentUser) {
      console.error("Grant Access: Missing pubkey or current user.");
      return;
    }

    console.log("Grant Access: Starting process...");

    try {
      const shelfKey = await getSelfShelfKey();
      console.log("Grant Access: Got self shelf key.");
      const shelfKeyJwk = await crypto.subtle.exportKey('jwk', shelfKey);
      const content = JSON.stringify({
        type: 'shelf-access-grant',
        shelfKey: shelfKeyJwk,
      });

      const dmEvent = new NDKEvent(ndk);
      dmEvent.kind = 44 as NDKKind;
      dmEvent.content = content;
      dmEvent.tags.push(['p', pubkey]);
      dmEvent.tags.push(['t', 'openbook:shelf:grant']);

      console.log("Grant Access: Event created, attempting to encrypt and publish...", dmEvent.rawEvent());

      // @ts-ignore
      if (!window.nostr || !window.nostr.nip44) {
        throw new Error("NIP-44 is not available on the window.nostr object.");
      }

      // Bypass NDK and use the NIP-07 window.nostr object directly
      // @ts-ignore
      dmEvent.content = await window.nostr.nip44.encrypt(pubkey, content);

      await dmEvent.publish();

      console.log("Grant Access: Successfully published event.");
      alert(`Access granted to ${profile?.displayName || 'this user'}.`);
    } catch (e) {
      console.error("Failed to grant shelf access:", e);
      alert("Failed to grant access. Make sure your NIP-07 extension is enabled and working correctly.");
    }
  };

  const shelves = useMemo(() => {
    const wantToRead: NDKEvent[] = [], reading: NDKEvent[] = [], read: NDKEvent[] = [];
    for (const event of events) {
      const status = event.tagValue('status');
      if (status === 'want-to-read') wantToRead.push(event);
      else if (status === 'reading') reading.push(event);
      else if (status === 'read') read.push(event);
    }
    return { wantToRead, reading, read };
  }, [events]);

  if (!pubkey) return <div>No user pubkey provided.</div>;

  const Shelf = ({ title, books }: { title: string; books: NDKEvent[] }) => (
    <div className="shelf">
      <div className="shelf-books">
        {books.length > 0 ? (
          books.map(event => <ShelvedBook key={event.id} event={event} currentUser={currentUser} />)
        ) : (
          <p className="shelf-empty-message">This shelf is empty.</p>
        )}
      </div>
      <div className="shelf-plank">
        <h2 className="shelf-title">{title} ({books.length})</h2>
      </div>
    </div>
  );

  const isOwnProfile = currentUser?.pubkey === pubkey;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={profile?.image || `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${pubkey}`} alt={profile?.displayName || 'author avatar'} style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
          <div>
            <h1>{profile?.displayName || profile?.name || `${pubkey.substring(0, 12)}...`}</h1>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <span>{following.size} Following</span>
                <span>{followers.size} Followers</span>
            </div>
            {profile?.about && <p>{profile.about}</p>}
          </div>
        </div>
        {currentUser && !isOwnProfile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={isFollowing ? handleUnfollow : handleFollow}>
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
            {!hasAccess && (
              <button onClick={handleGrantAccess}>
                Grant Shelf Access
              </button>
            )}
          </div>
        )}
      </div>
      <hr style={{ margin: '1rem 0 2rem' }}/>
      {events.length === 0 && <p>No books found on this user's shelves.</p>}
      {(events.length > 0) && (
        <div className="bookshelf-container">
          <Shelf title="Currently Reading" books={shelves.reading} />
          <Shelf title="Want to Read" books={shelves.wantToRead} />
          <Shelf title="Read" books={shelves.read} />
        </div>
      )}
    </div>
  );
}