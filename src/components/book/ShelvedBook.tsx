import React, { useState } from 'react';
import { NDKEvent, NDKUser } from '@nostr-dev-kit/ndk';
import { Link } from 'react-router-dom';
import BookReviewForm from './BookReviewForm';
import type { Book } from '../../pages/SearchPage';

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

  // Reconstruct a 'Book' object from the event tags for the form
  const bookForForm: Book = {
    key: `/works/${bookId}`,
    title: title,
    author_name: [author],
    cover_i: coverUrl ? parseInt(coverUrl.split('/id/')[1].split('-')[0]) : undefined,
    first_publish_year: parseInt(getTagValue(event, 'published_year') || '0')
  };

  return (
    <>
      <div style={{ position: 'relative', width: '180px', textAlign: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', borderRadius: '4px', overflow: 'hidden', background: '#fff' }}>
        <Link to={`/book/${bookId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          {coverUrl ? (
            <img src={coverUrl} alt={`Cover for ${title}`} style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '240px', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
              No Cover
            </div>
          )}
          <div style={{ padding: '10px' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{author}</p>
            {rating && (
              <div style={{ marginTop: '5px' }}>
                {'★'.repeat(parseInt(rating, 10)).padEnd(5, '☆')}
              </div>
            )}
          </div>
        </Link>
        {isOwnBook && (
          <button onClick={() => setIsEditing(true)} style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 10 }}>
            Edit
          </button>
        )}
      </div>
      {isEditing && (
        <BookReviewForm
          book={bookForForm}
          eventToEdit={event}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  );
}