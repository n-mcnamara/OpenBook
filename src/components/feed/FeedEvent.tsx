import React from 'react';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Link } from 'react-router-dom';

interface FeedEventProps {
  event: NDKEvent;
}

const getTagValue = (event: NDKEvent, tagName: string) => {
  return event.tags.find(tag => tag[0] === tagName)?.[1];
};

export default function FeedEvent({ event }: FeedEventProps) {
  const profile = useUserProfile(event.pubkey);

  const title = getTagValue(event, 'title');
  const coverUrl = getTagValue(event, 'cover');
  const status = getTagValue(event, 'status');
  const rating = getTagValue(event, 'rating');
  const bookId = getTagValue(event, 'd');

  const statusText = {
    'read': 'has read',
    'reading': 'is currently reading',
    'want-to-read': 'wants to read'
  }[status || ''] || 'updated';

  return (
    <div style={{ border: '1px solid #eee', padding: '1rem', marginBottom: '1rem', borderRadius: '8px' }}>
      <Link to={`/p/${event.pubkey}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <img
            src={profile?.image || `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${event.pubkey}`}
            alt={profile?.displayName || 'author avatar'}
            style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
          />
          <div>
            <strong>{profile?.displayName || profile?.name || event.pubkey.substring(0, 12)}</strong>
            <span style={{ color: '#666' }}> {statusText}</span>
          </div>
        </div>
      </Link>

      <div style={{ display: 'flex', gap: '1rem' }}>
        {bookId && coverUrl && (
          <Link to={`/book/${bookId}`}>
            <img src={coverUrl} alt={`Cover for ${title}`} style={{ width: '100px', height: '150px', objectFit: 'cover', borderRadius: '4px' }} />
          </Link>
        )}
        <div>
          {bookId ? (
            <Link to={`/book/${bookId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <h3>{title}</h3>
            </Link>
          ) : (
            <h3>{title}</h3>
          )}

          {rating && (
            <div style={{ fontSize: '1.2rem', color: 'gold' }}>
              {'★'.repeat(parseInt(rating, 10)).padEnd(5, '☆')}
            </div>
          )}
          {event.content && (
            <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>"{event.content}"</p>
          )}
        </div>
      </div>
    </div>
  );
}