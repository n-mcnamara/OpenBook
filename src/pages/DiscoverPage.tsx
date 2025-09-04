import { useState, useEffect } from 'react';
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import ndk from '../lib/ndk';
import FeedEvent from '../components/feed/FeedEvent';
import BookCard from '../components/book/BookCard';

interface BookOfTheWeek {
  id: string;
  title: string;
  author: string;
  cover: string;
  likes: number;
}

export default function DiscoverPage() {
  const [recentEvents, setRecentEvents] = useState<NDKEvent[]>([]);
  const [bookOfTheWeek, setBookOfTheWeek] = useState<BookOfTheWeek | null>(null);

  // Fetch recent reviews
  useEffect(() => {
    const sub = ndk.subscribe(
      [{ kinds: [30451 as NDKKind], limit: 50 }],
      { closeOnEose: false }
    );

    sub.on('event', (event: NDKEvent) => {
      setRecentEvents(prev => {
        if (prev.some(e => e.id === event.id)) return prev;
        return [...prev, event].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      });
    });

    return () => sub.stop();
  }, []);

  // Fetch and calculate Book of the Week
  useEffect(() => {
    const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

    const sub = ndk.subscribe([{
      kinds: [NDKKind.Reaction],
      since: oneWeekAgo,
      '#t': ['book-like'] // A convention to easily find book likes
    }]);

    const bookLikes: Record<string, number> = {};

    sub.on('event', (event: NDKEvent) => {
      if (event.content !== '+') return;
      const bookId = event.tagValue('d');
      if (bookId) {
        bookLikes[bookId] = (bookLikes[bookId] || 0) + 1;
      }
    });

    sub.on('eose', async () => {
      if (Object.keys(bookLikes).length === 0) return;

      const sortedBooks = Object.entries(bookLikes).sort((a, b) => b[1] - a[1]);
      const topBookId = sortedBooks[0][0];
      const topBookLikes = sortedBooks[0][1];

      const metadataEvent = await ndk.fetchEvent({
        kinds: [30452 as NDKKind],
        '#d': [topBookId]
      });

      if (metadataEvent) {
        try {
          const info = JSON.parse(metadataEvent.content);
          setBookOfTheWeek({
            id: topBookId,
            title: info.title,
            author: info.author,
            cover: info.cover,
            likes: topBookLikes,
          });
        } catch (e) { console.error("Failed to parse book of the week metadata", e); }
      }
    });
  }, []);

  return (
    <div>
      <h1>Discover</h1>
      <p>Recent book activity from across the network.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Recent Reviews */}
        <div>
          <h2>Most Recent Reviews</h2>
          {recentEvents.length > 0 ? (
            recentEvents.map(event => <FeedEvent key={event.id} event={event} />)
          ) : (
            <p>Waiting for recent activity from the network...</p>
          )}
        </div>

        {/* Right Column: Book of the Week */}
        <div>
          <h2>Book of the Week</h2>
          {bookOfTheWeek ? (
            <div>
              <BookCard
                book={{
                  key: `/works/${bookOfTheWeek.id}`,
                  title: bookOfTheWeek.title,
                  author_name: [bookOfTheWeek.author],
                  cover_i: parseInt(bookOfTheWeek.cover.split('/id/')[1].split('-')[0])
                }}
              />
              <p style={{ textAlign: 'center', fontWeight: 'bold' }}>
                ❤️ {bookOfTheWeek.likes} likes this week
              </p>
            </div>
          ) : (
            <p>No book likes found this week.</p>
          )}

          <div className="dev-note" style={{
            marginTop: '2rem',
            padding: '1rem',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--background-color)',
            fontSize: '0.9rem',
          }}>
            <h4 style={{ marginTop: 0 }}>Developer Note</h4>
            <p>
              The private bookshelves feature and granting access to friends is functional but should be considered experimental.
            </p>
            <p style={{ fontWeight: 'bold' }}>
              This system relies on an encrypted key stored in your browser's local storage. If you clear your browser data, you will lose access to your private shelf permanently.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
