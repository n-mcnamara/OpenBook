import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { NDKEvent, NDKKind, NDKSubscription } from '@nostr-dev-kit/ndk';
import ndk from '../lib/ndk';
import ReviewCard from '../components/book/ReviewCard';

export default function BookDetailsPage() {
  const { bookId } = useParams();
  const [reviews, setReviews] = useState<NDKEvent[]>([]);
  const [eose, setEose] = useState(false);
  const [openLibraryRating, setOpenLibraryRating] = useState<number | null>(null);

  // Fetch Nostr reviews
  useEffect(() => {
    if (!bookId) return;

    setReviews([]);
    setEose(false);

    const filter = {
      kinds: [30451 as NDKKind],
      '#d': [bookId],
    };

    const subscription: NDKSubscription = ndk.subscribe([filter]);

    subscription.on('event', (event: NDKEvent) => {
      setReviews(prev => {
        if (prev.some(e => e.id === event.id)) return prev;
        return [...prev, event].sort((a, b) => b.created_at! - a.created_at!);
      });
    });

    subscription.on('eose', () => {
      setEose(true);
    });

    return () => {
      subscription.stop();
    };
  }, [bookId]);

  // Fetch Open Library rating
  useEffect(() => {
    if (!bookId) return;

    const fetchRating = async () => {
      try {
        const response = await fetch(`https://openlibrary.org/works/${bookId}/ratings.json`);
        const data = await response.json();
        if (data.summary?.average) {
          // Open Library ratings are out of 5, but the API returns it out of 10 some times
          const rating = data.summary.average > 5 ? data.summary.average / 2 : data.summary.average;
          setOpenLibraryRating(rating);
        }
      } catch (error) {
        console.error("Failed to fetch Open Library rating:", error);
      }
    };

    fetchRating();
  }, [bookId]);

  const { nostrAverageRating, nostrTotalRatings, bookInfo } = useMemo(() => {
    if (reviews.length === 0) {
      return { nostrAverageRating: 0, nostrTotalRatings: 0, bookInfo: null };
    }

    let totalRating = 0;
    let ratedReviews = 0;
    const firstReview = reviews[0];

    for (const review of reviews) {
      const rating = review.tagValue('rating');
      if (rating) {
        totalRating += parseInt(rating, 10);
        ratedReviews++;
      }
    }

    const bookInfo = {
      title: firstReview.tagValue('title') || 'Unknown Title',
      author: firstReview.tagValue('author') || 'Unknown Author',
      cover: firstReview.tagValue('cover'),
    };

    return {
      nostrAverageRating: ratedReviews > 0 ? totalRating / ratedReviews : 0,
      nostrTotalRatings: ratedReviews,
      bookInfo,
    };
  }, [reviews]);

  if (!bookId) {
    return <div>No book ID provided.</div>;
  }

  if (!eose && reviews.length === 0) {
    return <p>Loading book details and reviews...</p>;
  }

  const renderStars = (rating: number) => (
    <span style={{ fontSize: '2rem', color: 'gold' }}>
      {'★'.repeat(Math.round(rating)).padEnd(5, '☆')}
    </span>
  );

  return (
    <div>
      {bookInfo && (
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
          <img src={bookInfo.cover} alt={`Cover for ${bookInfo.title}`} style={{ width: '180px', height: '270px', objectFit: 'cover', borderRadius: '8px' }} />
          <div>
            <h1>{bookInfo.title}</h1>
            <h2 style={{ fontWeight: 'normal', color: '#555' }}>by {bookInfo.author}</h2>
            
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
      )}

      <hr />

      <h2>Community Reviews</h2>
      {reviews.length > 0 ? (
        reviews.map(event => <ReviewCard key={event.id} event={event} />)
      ) : (
        <p>No reviews found for this book yet.</p>
      )}
    </div>
  );
}