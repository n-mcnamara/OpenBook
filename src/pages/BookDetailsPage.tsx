import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import ndk from '../lib/ndk';
import ReviewCard from '../components/book/ReviewCard';
import BookReviewForm from '../components/book/BookReviewForm';
import DiscussionComment from '../components/book/DiscussionComment';
import { useUserStore } from '../lib/store';
import type { Book } from './SearchPage';

interface BookInfo {
  title: string;
  author: string;
  cover?: string;
  cover_i?: number;
  first_publish_year?: number;
}

type MetadataSource = 'nostr' | 'openlibrary';
type ReactionMap = Record<string, { likes: Set<string>, dislikes: Set<string> }>;

export default function BookDetailsPage() {
  const { bookId } = useParams();
  const { user } = useUserStore();
  const [reviews, setReviews] = useState<NDKEvent[]>([]);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [discussion, setDiscussion] = useState<NDKEvent[]>([]);
  const [newComment, setNewComment] = useState('');
  const [openLibraryRating, setOpenLibraryRating] = useState<number | null>(null);
  
  const [nostrBookInfo, setNostrBookInfo] = useState<BookInfo | null>(null);
  const [openLibraryBookInfo, setOpenLibraryBookInfo] = useState<BookInfo | null>(null);
  const [metadataSource, setMetadataSource] = useState<MetadataSource>('openlibrary');
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);

  // Fetch book metadata (omitted for brevity, no changes)
  useEffect(() => {
    if (!bookId) return;
    const fetchNostrMetadata = async () => {
      const nostrMetadata = await ndk.fetchEvent({ kinds: [30452 as NDKKind], '#d': [bookId] });
      if (nostrMetadata) {
        try {
          const info = JSON.parse(nostrMetadata.content);
          setNostrBookInfo(info);
        } catch (e) { console.error("Failed to parse Nostr metadata", e); }
      }
    };
    fetchNostrMetadata();
  }, [bookId]);

  useEffect(() => {
    if (!bookId) return;
    const fetchOpenLibraryMetadata = async () => {
      try {
        const workResponse = await fetch(`https://openlibrary.org/works/${bookId}.json`);
        const workData = await workResponse.json();
        const authorResponse = await fetch(`https://openlibrary.org${workData.authors[0].author.key}.json`);
        const authorData = await authorResponse.json();
        const searchResponse = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(workData.title)}&author=${encodeURIComponent(authorData.name)}`);
        const searchData = await searchResponse.json();
        const bookDoc = searchData.docs.find((doc: any) => doc.key === `/works/${bookId}`);
        const info = {
          title: workData.title,
          author: authorData.name,
          cover: workData.covers?.[0] ? `https://covers.openlibrary.org/b/id/${workData.covers[0]}-L.jpg` : undefined,
          cover_i: workData.covers?.[0],
          first_publish_year: bookDoc?.first_publish_year,
        };
        setOpenLibraryBookInfo(info);
      } catch (error) { console.error("Failed to fetch from Open Library", error); }
    };
    fetchOpenLibraryMetadata();
  }, [bookId]);

  // Fetch Nostr reviews, reactions, and discussion
  useEffect(() => {
    if (!bookId) return;
    setReviews([]);
    setDiscussion([]);
    setReactions({});

    const reviewsSub = ndk.subscribe([{ kinds: [30451 as NDKKind], '#d': [bookId] }]);
    
    reviewsSub.on('event', (event: NDKEvent) => {
      setReviews(prev => {
        if (prev.some(e => e.id === event.id)) return prev;
        return [...prev, event];
      });
    });

    reviewsSub.on('eose', () => {
      setReviews(prevReviews => {
        const reviewIds = prevReviews.map(r => r.id);
        if (reviewIds.length === 0) return prevReviews;

        const reactionsSub = ndk.subscribe([{ kinds: [NDKKind.Reaction], '#e': reviewIds }]);
        reactionsSub.on('event', (event: NDKEvent) => {
          const eventId = event.tagValue('e');
          if (!eventId) return;

          setReactions(prev => {
            const current = prev[eventId] || { likes: new Set(), dislikes: new Set() };
            if (event.content === '+') {
              current.likes.add(event.pubkey);
            } else if (event.content === '-') {
              current.dislikes.add(event.pubkey);
            }
            return { ...prev, [eventId]: current };
          });
        });
        return prevReviews;
      });
    });

    const discussionSub = ndk.subscribe([{ kinds: [NDKKind.Text], '#d': [bookId], '#t': ['openbook-discussion'] }]);
    discussionSub.on('event', (event: NDKEvent) => {
      setDiscussion(prev => {
        if (prev.some(e => e.id === event.id)) return prev;
        return [...prev, event].sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
      });
    });

    return () => {
      reviewsSub.stop();
      discussionSub.stop();
    }
  }, [bookId]);

  // Fetch Open Library rating (omitted for brevity, no changes)
  useEffect(() => {
    if (!bookId) return;
    const fetchRating = async () => {
      try {
        const response = await fetch(`https://openlibrary.org/works/${bookId}/ratings.json`);
        const data = await response.json();
        if (data.summary?.average) {
          const rating = data.summary.average > 5 ? data.summary.average / 2 : data.summary.average;
          setOpenLibraryRating(rating);
        }
      } catch (error) { console.error("Failed to fetch Open Library rating:", error); }
    };
    fetchRating();
  }, [bookId]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bookId || !newComment.trim()) return;
    const event = new NDKEvent(ndk);
    event.kind = NDKKind.Text;
    event.content = newComment.trim();
    event.tags.push(['d', bookId]);
    event.tags.push(['t', 'openbook-discussion']);
    if (bookInfo?.title) {
      event.tags.push(['book-title', bookInfo.title]);
    }
    await event.publish();
    setNewComment('');
  };

  const handleReaction = (eventId: string, type: 'like' | 'dislike', pubkey: string) => {
    setReactions(prev => {
      const current = { 
        likes: new Set(prev[eventId]?.likes), 
        dislikes: new Set(prev[eventId]?.dislikes)
      };
      
      // Remove from the other set if user is changing their reaction
      if (type === 'like') {
        current.dislikes.delete(pubkey);
        current.likes.add(pubkey);
      } else {
        current.likes.delete(pubkey);
        current.dislikes.add(pubkey);
      }
      
      return { ...prev, [eventId]: current };
    });
  };

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const likesA = reactions[a.id]?.likes.size || 0;
      const likesB = reactions[b.id]?.likes.size || 0;
      return likesB - likesA;
    });
  }, [reviews, reactions]);

  const handleLikeBook = async () => {
    if (!user || !bookId) {
      alert("Please log in to like a book.");
      return;
    }

    // We need to find the metadata event to react to it.
    const nostrMetadata = await ndk.fetchEvent({ kinds: [30452 as NDKKind], '#d': [bookId] });

    if (!nostrMetadata) {
      alert("This book doesn't have Nostr metadata yet, so it can't be liked. Be the first to review or add it to a shelf!");
      return;
    }

    const reactionEvent = new NDKEvent(ndk);
    reactionEvent.kind = NDKKind.Reaction;
    reactionEvent.content = '+';
    reactionEvent.tags.push(['e', nostrMetadata.id]);
    reactionEvent.tags.push(['p', nostrMetadata.pubkey]);
    reactionEvent.tags.push(['d', bookId]);
    reactionEvent.tags.push(['t', 'book-like']); // Convention for discoverability

    await reactionEvent.publish();
    alert("Book liked!");
  };

  const { nostrAverageRating, nostrTotalRatings } = useMemo(() => {
    if (reviews.length === 0) return { nostrAverageRating: 0, nostrTotalRatings: 0 };
    let totalRating = 0, ratedReviews = 0;
    for (const review of reviews) {
      const rating = review.tagValue('rating');
      if (rating) {
        totalRating += parseInt(rating, 10);
        ratedReviews++;
      }
    }
    return {
      nostrAverageRating: ratedReviews > 0 ? totalRating / ratedReviews : 0,
      nostrTotalRatings: ratedReviews,
    };
  }, [reviews]);

  const bookInfo = metadataSource === 'nostr' && nostrBookInfo ? nostrBookInfo : openLibraryBookInfo;

  if (!bookId) return <div>No book ID provided.</div>;
  if (!bookInfo) return <p>Fetching book details from the network...</p>;

  const bookForForm: Book | undefined = openLibraryBookInfo ? {
    key: `/works/${bookId}`,
    title: openLibraryBookInfo.title,
    author_name: [openLibraryBookInfo.author],
    cover_i: openLibraryBookInfo.cover_i,
  } : undefined;

  const renderStars = (rating: number) => (
    <span style={{ fontSize: '2rem', color: 'gold' }}>{'★'.repeat(Math.round(rating)).padEnd(5, '☆')}</span>
  );

  return (
    <div>
      <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
        <button 
          onClick={() => setMetadataSource(metadataSource === 'nostr' ? 'openlibrary' : 'nostr')} 
          disabled={!nostrBookInfo}
          title={!nostrBookInfo ? "No Nostr metadata available for this book yet." : "Switch metadata source"}
        >
          Source: {metadataSource === 'nostr' ? 'Nostr' : 'Open Library'}
        </button>
      </div>
      {/* Header and metadata remains the same */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        {bookInfo.cover && <img src={bookInfo.cover} alt={`Cover for ${bookInfo.title}`} style={{ width: '180px', height: '270px', objectFit: 'cover' }} />}
        <div>
          <h1>{bookInfo.title}</h1>
          <h2 style={{ fontWeight: 'normal', color: '#555' }}>by {bookInfo.author}</h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            {bookForForm && (
              <button onClick={() => setIsReviewFormOpen(true)}>
                Add to Shelf / Review
              </button>
            )}
            <button onClick={handleLikeBook}>
              ❤️ Like Book
            </button>
          </div>
          {openLibraryRating && (
            <div style={{ marginTop: '1rem' }}>
              {renderStars(openLibraryRating)}
              <p>{openLibraryRating.toFixed(1)}/5 on Open Library</p>
            </div>
          )}
          {nostrTotalRatings > 0 && (
            <div style={{ marginTop: '1rem' }}>
              {renderStars(nostrAverageRating)}
              <p>{nostrAverageRating.toFixed(1)}/5 on Nostr ({nostrTotalRatings} review(s))</p>
            </div>
          )}
        </div>
      </div>
      <hr />
      <h2>Community Reviews</h2>
      {sortedReviews.length > 0 ? (
        sortedReviews.map(event => (
          <ReviewCard 
            key={event.id} 
            event={event} 
            likes={reactions[event.id]?.likes || new Set()}
            dislikes={reactions[event.id]?.dislikes || new Set()}
            onReaction={handleReaction}
          />
        ))
      ) : (
        <p>No reviews found for this book yet.</p>
      )}

      <hr />
      <h2>Open Discussion</h2>
      <div className="discussion-thread">
        {discussion.length > 0 ? (
          discussion.map(event => <DiscussionComment key={event.id} event={event} />)
        ) : (
          <p>No discussion for this book yet. Be the first to comment!</p>
        )}
      </div>
      {user && (
        <form onSubmit={handleCommentSubmit} className="comment-form" style={{ marginTop: '1.5rem' }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <button type="submit" style={{ marginTop: '0.5rem' }}>Post Comment</button>
        </form>
      )}

      {isReviewFormOpen && bookForForm && (
        <BookReviewForm book={bookForForm} onClose={() => setIsReviewFormOpen(false)} />
      )}
    </div>
  );
}