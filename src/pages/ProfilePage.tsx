import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { NDKEvent, NDKKind, NDKSubscription } from '@nostr-dev-kit/ndk';
import { useUserProfile } from '../hooks/useUserProfile';
import ndk from '../lib/ndk';
import { useUserStore } from '../lib/store';
import ShelvedBook from '../components/book/ShelvedBook';
import '../styles/Bookshelf.css';

export default function ProfilePage() {
  const { pubkey } = useParams();
  const { user: currentUser } = useUserStore();
  const [events, setEvents] = useState<NDKEvent[]>([]);
  const [eose, setEose] = useState(false);
  const [contactListEvent, setContactListEvent] = useState<NDKEvent | null>(null);
  const [followers, setFollowers] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());

  const profile = useUserProfile(pubkey);

  // Fetch followers and following
  useEffect(() => {
    if (!pubkey) return;

    // Fetch who the user is following
    const followingSub = ndk.subscribe({
        kinds: [NDKKind.Contacts],
        authors: [pubkey],
    });

    followingSub.on('event', (event: NDKEvent) => {
        const followedPubkeys = event.tags.filter(t => t[0] === 'p').map(t => t[1]);
        setFollowing(new Set(followedPubkeys));
    });

    // Fetch who is following the user
    const followersSub = ndk.subscribe({
        kinds: [NDKKind.Contacts],
        '#p': [pubkey],
    });

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

    ndk.fetchEvent({
      kinds: [NDKKind.Contacts],
      authors: [currentUser.pubkey],
    }).then(event => {
      setContactListEvent(event);
    });
  }, [currentUser]);

  const isFollowing = useMemo(() => {
    if (!contactListEvent || !pubkey) return false;
    return contactListEvent.tags.some(tag => tag[0] === 'p' && tag[1] === pubkey);
  }, [contactListEvent, pubkey]);

  // Fetch the profile user's book shelves
  useEffect(() => {
    if (!pubkey) return;
    setEvents([]);
    setEose(false);

    const isOwnProfile = currentUser?.pubkey === pubkey;
    const kinds = [30451 as NDKKind];
    if (isOwnProfile) {
      kinds.push(30454 as NDKKind);
    }

    const subscription: NDKSubscription = ndk.subscribe([{ kinds, authors: [pubkey] }]);
    
    subscription.on('event', async (event: NDKEvent) => {
      if (event.kind === 30454) {
        try {
          // Decrypt the content for the current user
          await event.decrypt(currentUser!);
        } catch (e) {
          console.error("Failed to decrypt private shelf event:", e);
          return; // Skip events that can't be decrypted
        }
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

    subscription.on('eose', () => setEose(true));
    return () => subscription.stop();
  }, [pubkey, currentUser]);

  const updateContactList = async (newTags: string[][]) => {
    const newEvent = new NDKEvent(ndk);
    newEvent.kind = NDKKind.Contacts;
    newEvent.tags = newTags;
    newEvent.content = contactListEvent?.content || '';

    try {
      await newEvent.publish();
      setContactListEvent(newEvent);
    } catch (error) {
      console.error("Failed to publish contact list update:", error);
      alert("Failed to update contact list. Please ensure your NIP-07 extension is enabled and connected.");
    }
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
    <div className="bookshelf">
      <h2 className="shelf-title">{title} ({books.length})</h2>
      <div className="shelf-row">
        {books.length > 0 ? books.map(event => <ShelvedBook key={event.id} event={event} currentUser={currentUser} />) : <p className="shelf-empty-message">[ Shelf is empty ]</p>}
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
          <button onClick={isFollowing ? handleUnfollow : handleFollow}>
            {isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        )}
      </div>
      <hr style={{ margin: '1rem 0 2rem' }}/>
      {!eose && events.length === 0 && <p>Loading shelves from the network...</p>}
      {eose && events.length === 0 && <p>This user has no books on their shelves.</p>}
      {(eose || events.length > 0) && (
        <>
          <Shelf title="Currently Reading" books={shelves.reading} />
          <Shelf title="Want to Read" books={shelves.wantToRead} />
          <Shelf title="Read" books={shelves.read} />
        </>
      )}
    </div>
  );
}