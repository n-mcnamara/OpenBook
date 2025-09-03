import React, { useState } from 'react';
import type { Book } from '../../pages/SearchPage';
import BookReviewForm from './BookReviewForm';
import { Link } from 'react-router-dom';

interface BookCardProps {
  book: Book;
  isNostr: boolean; // Prop to indicate if the book metadata is on Nostr
}

export default function BookCard({ book, isNostr }: BookCardProps) {
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const bookId = book.key.replace('/works/', '');

  const coverUrl = book.cover_i
    ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
    : null;

  return (
    <>
      <div style={{ position: 'relative', border: '1px solid #ccc', padding: '10px', borderRadius: '5px', width: '180px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {isNostr && (
          <span title="This book's metadata is on Nostr" style={{ position: 'absolute', top: '15px', left: '15px', fontSize: '1.5rem' }}>
            💜
          </span>
        )}
        <Link to={`/book/${bookId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          {coverUrl ? (
            <img src={coverUrl} alt={`Cover for ${book.title}`} style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '240px', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
              No Cover
            </div>
          )}
          <h3 style={{ fontSize: '1rem', margin: '10px 0 5px' }}>{book.title}</h3>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>{book.author_name?.[0]}</p>
        </Link>
        <button onClick={() => setIsReviewFormOpen(true)} style={{ marginTop: '10px' }}>
          Add to Shelf
        </button>
      </div>
      {isReviewFormOpen && (
        <BookReviewForm book={book} onClose={() => setIsReviewFormOpen(false)} />
      )}
    </>
  );
}