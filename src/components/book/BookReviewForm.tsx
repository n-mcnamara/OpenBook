import React, { useState, useEffect } from 'react';
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import ndk from '../../lib/ndk';
import { useUserStore } from '../../lib/store';
import { getSelfShelfKey, encryptShelfItem } from '../../lib/shelfCrypto';
import eventBus from '../../lib/EventBus';
import type { Book } from '../../pages/SearchPage';

interface BookReviewFormProps {
  book: Book;
  eventToEdit?: NDKEvent;
  isPublicEdit?: boolean;
  onClose: () => void;
}

type ShelfStatus = 'want-to-read' | 'reading' | 'read';

export default function BookReviewForm({ book, eventToEdit, isPublicEdit, onClose }: BookReviewFormProps) {
  const { user } = useUserStore();
  const [status, setStatus] = useState<ShelfStatus>('want-to-read');
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'success' | 'deleting'>('idle');

  useEffect(() => {
    if (eventToEdit) {
      setStatus(eventToEdit.tagValue('status') as ShelfStatus || 'want-to-read');
      setRating(parseInt(eventToEdit.tagValue('rating') || '0', 10));
      setReview(eventToEdit.content);
      setIsPrivate(eventToEdit.kind === 30454);
    }
  }, [eventToEdit]);

  const ensureBookMetadataIsOnNostr = async (bookId: string) => {
    const existingMetadata = await ndk.fetchEvent({
      kinds: [30452 as NDKKind],
      '#d': [bookId],
    });

    if (existingMetadata) return;

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
    await metadataEvent.publish();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setPublishState('publishing');
    const bookId = book.key.replace('/works/', '');

    if (!eventToEdit) {
      await ensureBookMetadataIsOnNostr(bookId);
    }

    const shelfEvent = new NDKEvent(ndk);
    shelfEvent.tags.push(['d', bookId]);
    shelfEvent.tags.push(['status', status]);

    if (status === 'read' && rating > 0) {
      shelfEvent.tags.push(['rating', rating.toString()]);
    }
    
    const addMetadataTags = (event: NDKEvent) => {
        if (eventToEdit) {
            eventToEdit.tags.forEach(tag => {
                if (['title', 'author', 'cover', 'published_year'].includes(tag[0])) {
                    event.tags.push(tag);
                }
            });
        } else {
            event.tags.push(['title', book.title]);
            if (book.author_name?.[0]) event.tags.push(['author', book.author_name[0]]);
            if (book.cover_i) event.tags.push(['cover', `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`]);
            if (book.first_publish_year) event.tags.push(['published_year', book.first_publish_year.toString()]);
        }
    };

    if (isPrivate) {
      shelfEvent.kind = 30454 as NDKKind;
      const shelfKey = await getSelfShelfKey();
      const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : '';
      const contentToEncrypt = JSON.stringify({ review, rating, cover: coverUrl });
      shelfEvent.content = await encryptShelfItem(contentToEncrypt, shelfKey);
      addMetadataTags(shelfEvent);
    } else {
      shelfEvent.kind = 30451 as NDKKind;
      shelfEvent.content = review;
      addMetadataTags(shelfEvent);
    }

    await shelfEvent.publish();
    setPublishState('success');

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleRemove = async () => {
    if (!eventToEdit) {
      alert("Cannot remove book: event data is missing.");
      return;
    }

    if (window.confirm('Are you sure you want to remove this book from your shelf?')) {
      setPublishState('deleting');

      try {
        // Use the NDK's built-in method to create and publish a deletion event
        await eventToEdit.delete();

        eventBus.emit('shelf-item-deleted', eventToEdit.tagValue('d'));
        onClose();
      } catch (e) {
        console.error("Failed to publish deletion event:", e);
        setPublishState('idle');
        alert("Failed to remove book. See the browser console for more details.");
      }
    }
  };

  return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', color: 'black', padding: '2rem', border: '1px solid #ccc', zIndex: 100, maxWidth: '500px', width: '90%' }}>
      <h2 style={{ marginTop: 0 }}>{book.title}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Shelf:</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ShelfStatus)} style={{ width: '100%', padding: '0.5rem', color: 'black', backgroundColor: 'white', border: '1px solid #ccc', boxSizing: 'border-box' }}>
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
            style={{ width: '100%', boxSizing: 'border-box', color: 'black', backgroundColor: 'white', border: '1px solid #ccc' }}
            placeholder="Your thoughts on the book..."
          />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={isPublicEdit}
            />
            Keep this private
          </label>
          {isPublicEdit && (
            <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.5rem 0 0' }}>
              Public items cannot be made private. To make this private, please remove it and add it again.
            </p>
          )}
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {eventToEdit ? (
            <button type="button" onClick={handleRemove} disabled={publishState !== 'idle'} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px' }}>
              {publishState === 'deleting' ? 'Removing...' : 'Remove from Shelf'}
            </button>
          ) : (
            <div /> 
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} disabled={publishState !== 'idle'} style={{ border: '1px solid #ccc', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px' }}>Cancel</button>
            <button type="submit" disabled={publishState !== 'idle'} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px' }}>
              {publishState === 'publishing' && 'Publishing...'}
              {publishState === 'success' && 'Published!'}
              {publishState === 'idle' && (eventToEdit ? 'Update Review' : 'Publish to Nostr')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}