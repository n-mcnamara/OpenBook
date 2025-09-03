import React, { useState, useEffect } from 'react';
import { NDKEvent, NDKKind, NDKSubscription } from '@nostr-dev-kit/ndk';
import ndk from '../lib/ndk';
import FeedEvent from '../components/feed/FeedEvent';

export default function DiscoverPage() {
  const [events, setEvents] = useState<NDKEvent[]>([]);
  const [eose, setEose] = useState(false);

  useEffect(() => {
    setEvents([]);
    setEose(false);

    const subscription: NDKSubscription = ndk.subscribe(
      [{
        kinds: [30451 as NDKKind],
        limit: 50,
      }],
      { closeOnEose: false }
    );

    subscription.on('event', (event: NDKEvent) => {
      setEvents(prevEvents => {
        if (prevEvents.some(e => e.id === event.id)) {
          return prevEvents;
        }
        const newEvents = [...prevEvents, event];
        return newEvents.sort((a, b) => b.created_at! - a.created_at!);
      });
    });

    subscription.on('eose', () => {
      setEose(true);
    });

    return () => {
      subscription.stop();
    };
  }, []);

  return (
    <div>
      <h1>Discover</h1>
      <p>Recent book activity from across the network.</p>
      
      {!eose && events.length === 0 && <p>Loading recent activity...</p>}
      
      <div>
        {events.map(event => (
          <FeedEvent key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}