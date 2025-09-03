import React, { useState, useEffect } from 'react';
import { NDKEvent, NDKKind, NDKSubscription } from '@nostr-dev-kit/ndk';
import ndk from '../lib/ndk';
import { useUserStore } from '../lib/store';
import FeedEvent from '../components/feed/FeedEvent';

export default function HomePage() {
  const { user } = useUserStore();
  const [feedEvents, setFeedEvents] = useState<NDKEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let feedSubscription: NDKSubscription | undefined;

    const fetchFollowsAndSubscribe = async () => {
      setIsLoading(true);
      setFeedEvents([]);

      console.log("HomePage: Fetching contact list for pubkey:", user.pubkey);
      const followEvent = await ndk.fetchEvent({
        kinds: [NDKKind.Contacts],
        authors: [user.pubkey],
      });

      if (followEvent) {
        console.log("HomePage: Found contact list event:", followEvent.rawEvent());
        const followedPubkeys = followEvent.tags
          .filter(tag => tag[0] === 'p')
          .map(tag => tag[1]);

        console.log("HomePage: Extracted followed pubkeys:", followedPubkeys);

        if (followedPubkeys.length > 0) {
          console.log("HomePage: Subscribing to feed for followed pubkeys.");
          feedSubscription = ndk.subscribe(
            [{
              kinds: [30451 as NDKKind],
              authors: followedPubkeys,
              limit: 50,
            }],
            { closeOnEose: false }
          );

          feedSubscription.on('event', (event: NDKEvent) => {
            console.log("HomePage: Received feed event:", event.rawEvent());
            setFeedEvents(prevEvents => {
              if (prevEvents.some(e => e.id === event.id)) {
                return prevEvents;
              }
              const newEvents = [...prevEvents, event];
              return newEvents.sort((a, b) => b.created_at! - a.created_at!);
            });
          });

          feedSubscription.on('eose', () => {
            console.log("HomePage: Feed subscription EOSE.");
            setIsLoading(false);
          });
        } else {
          console.log("HomePage: No followed pubkeys found in contact list.");
          setIsLoading(false);
        }
      } else {
        console.log("HomePage: No contact list event found for the user.");
        setIsLoading(false);
      }
    };

    fetchFollowsAndSubscribe();

    return () => {
      if (feedSubscription) {
        console.log("HomePage: Stopping feed subscription.");
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
      <h1>Home Feed</h1>
      {isLoading && <p>Loading feed from your network...</p>}
      {!isLoading && feedEvents.length === 0 && (
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