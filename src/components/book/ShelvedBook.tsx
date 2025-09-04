import { useState } from 'react';
import { NDKEvent, NDKUser } from '@nostr-dev-kit/ndk';
import { Link } from 'react-router-dom';
import BookReviewForm from './BookReviewForm';
import type { Book } from '../../pages/SearchPage';
import '../../styles/Card.css';

interface ShelvedBookProps {
  event: NDKEvent;
  currentUser?: NDKUser | null;
}

const getTagValue = (event: NDKEvent, tagName: string) => {
  return event.tags.find(tag => tag[0] === tagName)?.[1];
};

export default function ShelvedBook({ event, currentUser }: ShelvedBookProps) {
  const [isEditing, setIsEditing] = useState(false);

  const title = getTagValue(event, 'title') || 'Unknown Title';
  const author = getTagValue(event, 'author') || 'Unknown Author';
  const coverUrl = getTagValue(event, 'cover');
  const rating = getTagValue(event, 'rating');
  const bookId = getTagValue(event, 'd');

  if (!bookId) return null;

  const isOwnBook = currentUser?.pubkey === event.pubkey;

  const bookForForm: Book = {
    key: `/works/${bookId}`,
    title: title,
    author_name: [author],
    cover_i: coverUrl ? parseInt(coverUrl.split('/id/')[1].split('-')[0]) : undefined,
    first_publish_year: parseInt(getTagValue(event, 'published_year') || '0')
  };

  return (
    <>
      <div className="card book-card shelved-book">
        {isOwnBook && (
          <button onClick={() => setIsEditing(true)} className="edit-button">
            Edit
          </button>
        )}
        <Link to={`/book/${bookId}`} className="book-card-link">
          {coverUrl ? (
            <img src={coverUrl} alt={`Cover for ${title}`} className="book-card-cover" />
          ) : (
            <div className="book-card-no-cover">No Cover</div>
          )}
          <div className="book-card-info">
            <h3>{title} {event.kind === 30454 && '🔒'}</h3>
            <p>{author}</p>
            {rating && (
              <div className="star-rating">
                {'★'.repeat(parseInt(rating, 10)).padEnd(5, '☆')}
              </div>
            )}
          </div>
        </Link>
      </div>
      {isEditing && (
        <BookReviewForm
          book={bookForForm}
          eventToEdit={event}
          isPublicEdit={event.kind === 30451}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  );
}