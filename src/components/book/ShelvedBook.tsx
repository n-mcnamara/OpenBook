import { useState, useEffect } from 'react';
import { NDKEvent, NDKUser } from '@nostr-dev-kit/ndk';
import { Link } from 'react-router-dom';
import BookReviewForm from './BookReviewForm';
import type { Book } from '../../pages/SearchPage';
import '../../styles/Card.css';

interface ShelvedBookProps {
  event: NDKEvent;
  currentUser?: NDKUser | null;
}

interface BookInfo {
  title: string;
  author: string;
  coverUrl?: string;
  published_year?: string;
  cover_i?: number;
}

const getTagValue = (event: NDKEvent, tagName: string) => {
  return event.tags.find(tag => tag[0] === tagName)?.[1];
};

export default function ShelvedBook({ event, currentUser }: ShelvedBookProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);

  const rating = getTagValue(event, 'rating');
  const bookId = getTagValue(event, 'd');

  useEffect(() => {
    const fetchBookInfo = async () => {
      if (!bookId) return;

      const title = getTagValue(event, 'title');
      const author = getTagValue(event, 'author');
      const coverUrl = getTagValue(event, 'cover');

      if (title && author) {
        setBookInfo({ title, author, coverUrl });
        return;
      }

      // If metadata is missing, fetch from Open Library
      try {
        const response = await fetch(`https://openlibrary.org/works/${bookId}.json`);
        const data = await response.json();
        const authorResponse = await fetch(`https://openlibrary.org${data.authors[0].author.key}.json`);
        const authorData = await authorResponse.json();

        const fetchedInfo: BookInfo = {
          title: data.title,
          author: authorData.name,
          coverUrl: data.covers?.[0] ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg` : undefined,
          cover_i: data.covers?.[0],
        };
        setBookInfo(fetchedInfo);
      } catch (error) {
        console.error("Failed to fetch book info:", error);
        setBookInfo({ title: 'Unknown Title', author: 'Unknown Author' });
      }
    };

    fetchBookInfo();
  }, [event, bookId]);

  if (!bookId) return null;
  if (!bookInfo) return <div>Loading book...</div>; // Or a placeholder

  const isOwnBook = currentUser?.pubkey === event.pubkey;

  const bookForForm: Book = {
    key: `/works/${bookId}`,
    title: bookInfo.title,
    author_name: [bookInfo.author],
    cover_i: bookInfo.cover_i,
    first_publish_year: parseInt(bookInfo.published_year || '0')
  };

  return (
    <>
      <div className="book-card shelved-book" style={{ width: '150px', flexShrink: 0 }}>
        {isOwnBook && (
          <button onClick={() => setIsEditing(true)} className="edit-button">
            Edit
          </button>
        )}
        <Link to={`/book/${bookId}`} className="book-card-link">
          {bookInfo.coverUrl ? (
            <img src={bookInfo.coverUrl} alt={`Cover for ${bookInfo.title}`} className="book-card-cover" style={{ height: '220px' }} />
          ) : (
            <div className="book-card-no-cover" style={{ height: '220px' }}>No Cover</div>
          )}
          <div className="book-card-info">
            <h3>{event.kind === 30454 && '🔒'} {bookInfo.title}</h3>
            <p>{bookInfo.author}</p>
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