import { useState } from 'react';
import type { Book } from '../../pages/SearchPage';
import BookReviewForm from './BookReviewForm';
import { Link } from 'react-router-dom';
import '../../styles/Card.css';

interface BookCardProps {
  book: Book;
  isNostr: boolean;
}

export default function BookCard({ book, isNostr }: BookCardProps) {
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const bookId = book.key.replace('/works/', '');

  const coverUrl = book.cover_i
    ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
    : null;

  return (
    <>
      <div className="card book-card">
        {isNostr && (
          <span title="This book's metadata is on Nostr" className="nostr-stamp">
            💜
          </span>
        )}
        <Link to={`/book/${bookId}`} className="book-card-link">
          {coverUrl ? (
            <img src={coverUrl} alt={`Cover for ${book.title}`} className="book-card-cover" />
          ) : (
            <div className="book-card-no-cover">No Cover</div>
          )}
          <div className="book-card-info">
            <h3>{book.title}</h3>
            <p>{book.author_name?.[0]}</p>
          </div>
        </Link>
        <button onClick={() => setIsReviewFormOpen(true)}>
          Add to Shelf
        </button>
      </div>
      {isReviewFormOpen && (
        <BookReviewForm book={book} onClose={() => setIsReviewFormOpen(false)} />
      )}
    </>
  );
}