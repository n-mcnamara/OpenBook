import React from 'react';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Link } from 'react-router-dom';

interface ReviewCardProps {
  event: NDKEvent;
}

export default function ReviewCard({ event }: ReviewCardProps) {
  const profile = useUserProfile(event.pubkey);
  const rating = event.tagValue('rating');

  return (
    <div style={{ borderBottom: '1px solid #eee', padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <img
          src={profile?.image || `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${event.pubkey}`}
          alt={profile?.displayName || 'author avatar'}
          style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
        />
        <div>
          <Link to={`/p/${event.pubkey}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <strong>{profile?.displayName || profile?.name || event.pubkey.substring(0, 12)}</strong>
          </Link>
          {rating && (
            <div style={{ fontSize: '1rem', color: 'gold', marginTop: '4px' }}>
              {'★'.repeat(parseInt(rating, 10)).padEnd(5, '☆')}
            </div>
          )}
        </div>
      </div>
      <p style={{ fontStyle: 'italic' }}>"{event.content}"</p>
    </div>
  );
}