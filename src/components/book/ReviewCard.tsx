import { NDKEvent } from '@nostr-dev-kit/ndk';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Link } from 'react-router-dom';
import '../../styles/Card.css';

interface ReviewCardProps {
  event: NDKEvent;
}

export default function ReviewCard({ event }: ReviewCardProps) {
  const profile = useUserProfile(event.pubkey);
  const rating = event.tagValue('rating');

  return (
    <div className="card review-card">
      <div className="review-card-header">
        <img
          src={profile?.image || `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${event.pubkey}`}
          alt={profile?.displayName || 'author avatar'}
          className="avatar"
        />
        <div className="review-card-author">
          <Link to={`/p/${event.pubkey}`}>
            <strong>{profile?.displayName || profile?.name || event.pubkey.substring(0, 12)}</strong>
          </Link>
          {rating && (
            <div className="star-rating">
              {'★'.repeat(parseInt(rating, 10)).padEnd(5, '☆')}
            </div>
          )}
        </div>
      </div>
      <p className="review-card-content">"{event.content}"</p>
    </div>
  );
}