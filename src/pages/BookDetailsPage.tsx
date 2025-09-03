import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { NDKEvent, NDKKind, NDKSubscription } from '@nostr-dev-kit/ndk';
import ndk from '../lib/ndk';
import ReviewCard from '../components/book/ReviewCard';
import BookReviewForm from '../components/book/BookReviewForm';
import type { Book } from './SearchPage';

interface BookInfo {
  title: string;
  author: string;
  cover?: string;
}

type MetadataSource = 'nostr' | 'openlibrary';

export default function BookDetailsPage() {
  const { bookId } = useParams();
  const [reviews, setReviews] = useState<NDKEvent[]>([]);
  const [openLibraryRating, setOpenLibraryRating] = useState<number | null>(null);
  
  const [nostrBookInfo, setNostrBookInfo] = useState<BookInfo | null>(null);
  const [openLibraryBookInfo, setOpenLibraryBookInfo] = useState<BookInfo | null>(null);
  const [metadataSource, setMetadataSource] = useState<MetadataSource>('nostr');
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);

  // Fetch book metadata from Nostr
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

  // Fetch book metadata from Open Library
  useEffect(() => {
    if (!bookId) return;
    const fetchOpenLibraryMetadata = async () => {
      try {
        const response = await fetch(`https://openlibrary.org/works/${bookId}.json`);
        const data = await response.json();
        const authorResponse = await fetch(`https://openlibrary.org${data.authors[0].author.key}.json`);
        const authorData = await authorResponse.json();
        const info = {
          title: data.title,
          author: authorData.name,
          cover: data.covers?.[0] ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg` : undefined,
        };
        setOpenLibraryBookInfo(info);
      } catch (error) { console.error("Failed to fetch from Open Library", error); }
    };
    fetchOpenLibraryMetadata();
  }, [bookId]);

  // Fetch Nostr reviews
  useEffect(() => {
    if (!bookId) return;
    setReviews([]);
    const subscription: NDKSubscription = ndk.subscribe([{ kinds: [30451 as NDKKind], '#d': [bookId] }]);
    subscription.on('event', (event: NDKEvent) => {
      setReviews(prev => {
        if (prev.some(e => e.id === event.id)) return prev;
        return [...prev, event].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      });
    });
    return () => subscription.stop();
  }, [bookId]);

  // Fetch Open Library rating
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
  if (!bookInfo) return <p>Loading book details...</p>;

  // Reconstruct a 'Book' object for the form
  const bookForForm: Book = {
    key: `/works/${bookId}`,
    title: bookInfo.title,
    author_name: [bookInfo.author],
    cover_i: bookInfo.cover ? parseInt(bookInfo.cover.split('/id/')[1].split('-')[0]) : undefined,
  };

  const renderStars = (rating: number) => (
    <span style={{ fontSize: '2rem', color: 'gold' }}>{'★'.repeat(Math.round(rating)).padEnd(5, '☆')}</span>
  );

  return (
    <div>
      {nostrBookInfo && openLibraryBookInfo && (
        <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
          <button onClick={() => setMetadataSource(metadataSource === 'nostr' ? 'openlibrary' : 'nostr')}>
            Switch to {metadataSource === 'nostr' ? 'Open Library' : 'Nostr'} Source
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        {bookInfo.cover && <img src={bookInfo.cover} alt={`Cover for ${bookInfo.title}`} style={{ width: '180px', height: '270px', objectFit: 'cover', borderRadius: '8px' }} />}
        <div>
          <h1>{bookInfo.title}</h1>
          <h2 style={{ fontWeight: 'normal', color: '#555' }}>by {bookInfo.author}</h2>
          
          <button onClick={() => setIsReviewFormOpen(true)} style={{ marginTop: '1rem' }}>
            Add to Shelf / Review
          </button>

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
      {reviews.length > 0 ? (
        reviews.map(event => <ReviewCard key={event.id} event={event} />)
      ) : (
        <p>No reviews found for this book yet.</p>
      )}

      {isReviewFormOpen && (
        <BookReviewForm book={bookForForm} onClose={() => setIsReviewFormOpen(false)} />
      )}
    </div>
  );
}