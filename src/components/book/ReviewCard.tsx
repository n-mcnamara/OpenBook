import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Link } from 'react-router-dom';
import ndk from '../../lib/ndk';
import { useUserStore } from '../../lib/store';
import '../../styles/Card.css';

interface ReviewCardProps {
  event: NDKEvent;
  likes: Set<string>;
  dislikes: Set<string>;
  onReaction: (eventId: string, type: 'like' | 'dislike', pubkey: string) => void;
}

export default function ReviewCard({ event, likes, dislikes, onReaction }: ReviewCardProps) {
  const { user } = useUserStore();
  const profile = useUserProfile(event.pubkey);
  const rating = event.tagValue('rating');

  const userReaction = user ? (likes.has(user.pubkey) ? 'like' : dislikes.has(user.pubkey) ? 'dislike' : null) : null;

  const handleReaction = async (reaction: '+' | '-') => {
    if (!user) {
      alert("Please log in to react.");
      return;
    }

    if (user.pubkey === event.pubkey) {
      alert("You cannot react to your own review.");
      return;
    }

    // Optimistically update the UI
    onReaction(event.id, reaction === '+' ? 'like' : 'dislike', user.pubkey);

    const reactionEvent = new NDKEvent(ndk);
    reactionEvent.kind = NDKKind.Reaction;
    reactionEvent.content = reaction;
    reactionEvent.tags.push(['e', event.id]);
    reactionEvent.tags.push(['p', event.pubkey]);
    
    const bookId = event.tagValue('d');
    if (bookId) {
      reactionEvent.tags.push(['d', bookId]);
    }

    await reactionEvent.publish();
  };

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
      <div className="review-actions" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button onClick={() => handleReaction('+')} disabled={!user || userReaction === 'like' || user?.pubkey === event.pubkey} style={{ opacity: userReaction === 'like' ? 0.5 : 1 }}>
          👍 {likes.size}
        </button>
        <button onClick={() => handleReaction('-')} disabled={!user || userReaction === 'dislike' || user?.pubkey === event.pubkey} style={{ opacity: userReaction === 'dislike' ? 0.5 : 1 }}>
          👎 {dislikes.size}
        </button>
      </div>
    </div>
  );
}
