import { useState, useEffect } from 'react';
import { NDKEvent, NDKKind, NDKSubscription } from '@nostr-dev-kit/ndk';
import ndk from '../lib/ndk';
import { useUserStore } from '../lib/store';
import FeedEvent from '../components/feed/FeedEvent';

export default function HomePage() {
  const { user } = useUserStore();
  const [feedEvents, setFeedEvents] = useState<NDKEvent[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let feedSubscription: NDKSubscription | undefined;

    const fetchFollowsAndSubscribe = async () => {
      setFeedEvents([]);

      const followEvent = await ndk.fetchEvent({
        kinds: [NDKKind.Contacts],
        authors: [user.pubkey],
      });

      if (followEvent) {
        const followedPubkeys = followEvent.tags
          .filter(tag => tag[0] === 'p')
          .map(tag => tag[1]);

        if (followedPubkeys.length > 0) {
          feedSubscription = ndk.subscribe(
            [{
              kinds: [30451 as NDKKind], // Explicitly public shelf events
              authors: followedPubkeys,
              limit: 50,
            }],
            { closeOnEose: false }
          );

          feedSubscription.on('event', (event: NDKEvent) => {
            setFeedEvents(prevEvents => {
              if (prevEvents.some(e => e.id === event.id)) {
                return prevEvents;
              }
              const newEvents = [...prevEvents, event];
              return newEvents.sort((a, b) => b.created_at! - a.created_at!);
            });
          });
        }
      }
    };

    fetchFollowsAndSubscribe();

    return () => {
      if (feedSubscription) {
        feedSubscription.stop();
      }
    };
  }, [user]);

  if (!user) {
    return (
      <div>
        <h1>Welcome to OpenBook</h1>
        <p>Please log in to see your feed.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Friends Feed</h1>
      {feedEvents.length === 0 && (
        <p>
          Your feed is empty. Try following some users or adding books to your own shelves.
        </p>
      )}
      <div>
        {feedEvents.map(event => (
          <FeedEvent key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}