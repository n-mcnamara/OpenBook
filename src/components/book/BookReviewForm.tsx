import React, { useState, useEffect } from 'react';
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import ndk from '../../lib/ndk';
import { useUserStore } from '../../lib/store';
import type { Book } from '../../pages/SearchPage';

interface BookReviewFormProps {
  book: Book;
  eventToEdit?: NDKEvent;
  onClose: () => void;
}

type ShelfStatus = 'want-to-read' | 'reading' | 'read';

export default function BookReviewForm({ book, eventToEdit, onClose }: BookReviewFormProps) {
  const { user } = useUserStore();
  const [status, setStatus] = useState<ShelfStatus>('want-to-read');
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState('');
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'success'>('idle');

  useEffect(() => {
    if (eventToEdit) {
      setStatus(eventToEdit.tagValue('status') as ShelfStatus || 'want-to-read');
      setRating(parseInt(eventToEdit.tagValue('rating') || '0', 10));
      setReview(eventToEdit.content);
    }
  }, [eventToEdit]);

  const ensureBookMetadataIsOnNostr = async (bookId: string) => {
    const existingMetadata = await ndk.fetchEvent({
      kinds: [30452 as NDKKind],
      '#d': [bookId],
    });

    if (existingMetadata) {
      console.log(`DEBUG: Metadata for ${bookId} already exists.`);
      return;
    }

    console.log(`DEBUG: No metadata for ${bookId} found. Publishing...`);
    const metadataEvent = new NDKEvent(ndk);
    metadataEvent.kind = 30452 as NDKKind;
    
    const title = book.title.toLowerCase().substring(0, 256);
    const author = book.author_name?.[0]?.toLowerCase().substring(0, 256) || '';
    metadataEvent.tags.push(['d', bookId]);
    metadataEvent.tags.push(['title', title]);
    if (author) metadataEvent.tags.push(['author', author]);
    
    const content = {
      title: book.title,
      author: book.author_name?.[0] || '',
      cover: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : '',
      published_year: book.first_publish_year?.toString() || '',
    };
    metadataEvent.content = JSON.stringify(content);

    try {
      console.log("DEBUG: Publishing kind:30452 event:", metadataEvent.rawEvent());
      await metadataEvent.publish();
      console.log("DEBUG: Successfully published metadata.");
    } catch (e) {
      console.error("DEBUG: Failed to publish metadata event:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please login to add a book.');
      return;
    }

    setPublishState('publishing');
    const bookId = book.key.replace('/works/', '');

    if (!eventToEdit) {
      await ensureBookMetadataIsOnNostr(bookId);
    }

    const shelfEvent = new NDKEvent(ndk);
    shelfEvent.kind = 30451;
    shelfEvent.content = review;
    shelfEvent.tags.push(['d', bookId]);
    shelfEvent.tags.push(['status', status]);

    if (status === 'read' && rating > 0) {
      shelfEvent.tags.push(['rating', rating.toString()]);
    }

    if (eventToEdit) {
        eventToEdit.tags.forEach(tag => {
            if (['title', 'author', 'cover', 'published_year'].includes(tag[0])) {
                shelfEvent.tags.push(tag);
            }
        });
    } else {
        shelfEvent.tags.push(['title', book.title]);
        if (book.author_name?.[0]) shelfEvent.tags.push(['author', book.author_name[0]]);
        if (book.cover_i) shelfEvent.tags.push(['cover', `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`]);
        if (book.first_publish_year) shelfEvent.tags.push(['published_year', book.first_publish_year.toString()]);
    }

    shelfEvent.publish();
    setPublishState('success');

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '2rem', border: '1px solid #ccc', zIndex: 100 }}>
      <h2>{book.title}</h2>
      <form onSubmit={handleSubmit}>
        {/* Form content remains the same */}
        <div>
          <label>Shelf:</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ShelfStatus)}>
            <option value="want-to-read">Want to Read</option>
            <option value="reading">Currently Reading</option>
            <option value="read">Read</option>
          </select>
        </div>
        {status === 'read' && (
          <div style={{ marginTop: '1rem' }}>
            <label>Rating:</label>
            <div>
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} onClick={() => setRating(star)} style={{ cursor: 'pointer', fontSize: '1.5rem', color: star <= rating ? 'gold' : 'grey' }}>
                  ★
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: '1rem' }}>
          <label>Review:</label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={5}
            style={{ width: '100%' }}
            placeholder="Your thoughts on the book..."
          />
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onClose} disabled={publishState !== 'idle'}>Cancel</button>
          <button type="submit" disabled={publishState !== 'idle'}>
            {publishState === 'publishing' && 'Publishing...'}
            {publishState === 'success' && 'Published!'}
            {publishState === 'idle' && (eventToEdit ? 'Update Review' : 'Publish to Nostr')}
          </button>
        </div>
      </form>
    </div>
  );
}