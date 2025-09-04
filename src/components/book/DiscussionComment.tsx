import { NDKEvent } from '@nostr-dev-kit/ndk';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Link } from 'react-router-dom';

interface DiscussionCommentProps {
  event: NDKEvent;
}

export default function DiscussionComment({ event }: DiscussionCommentProps) {
  const profile = useUserProfile(event.pubkey);

  return (
    <div className="discussion-comment card" style={{ marginBottom: '1rem' }}>
      <div className="comment-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
        <Link to={`/u/${event.author.npub}`}>
          <img
            src={profile?.image || `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${event.pubkey}`}
            alt={profile?.displayName || 'author avatar'}
            className="avatar"
            style={{ width: '30px', height: '30px' }}
          />
        </Link>
        <Link to={`/u/${event.author.npub}`} style={{ fontWeight: 'bold', textDecoration: 'none' }}>
          {profile?.displayName || profile?.name || event.author.npub.substring(0, 12)}
        </Link>
      </div>
      <p style={{ margin: 0 }}>{event.content}</p>
    </div>
  );
}
