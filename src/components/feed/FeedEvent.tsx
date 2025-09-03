import { NDKEvent } from '@nostr-dev-kit/ndk';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Link } from 'react-router-dom';
import '../../styles/Card.css';

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
    <div className="card feed-event-card">
      <Link to={`/p/${event.pubkey}`} className="feed-event-header">
        <img
          src={profile?.image || `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${event.pubkey}`}
          alt={profile?.displayName || 'author avatar'}
          className="avatar"
        />
        <div>
          <strong>{profile?.displayName || profile?.name || event.pubkey.substring(0, 12)}</strong>
          <span className="status-text"> {statusText}</span>
        </div>
      </Link>

      <div className="feed-event-body">
        {bookId && coverUrl && (
          <Link to={`/book/${bookId}`}>
            <img src={coverUrl} alt={`Cover for ${title}`} className="feed-event-cover" />
          </Link>
        )}
        <div className="feed-event-info">
          {bookId ? (
            <Link to={`/book/${bookId}`}>
              <h3>{title}</h3>
            </Link>
          ) : (
            <h3>{title}</h3>
          )}

          {rating && (
            <div className="star-rating">
              {'★'.repeat(parseInt(rating, 10)).padEnd(5, '☆')}
            </div>
          )}
          {event.content && (
            <p className="review-content">"{event.content}"</p>
          )}
        </div>
      </div>
    </div>
  );
}