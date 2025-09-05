
import React, { useState } from 'react';
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import ndk from '../../lib/ndk';
import { useUserStore } from '../../lib/store';

const BOOKSTR_KINDS = {
  REVIEW: 31985,
  BOOK_READ: 10073,
  BOOK_READING: 10074,
  BOOK_TBR: 10075,
};

const BookstrImport = () => {
  const { user } = useUserStore();
  const [isImporting, setIsImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);

  const getWorkIdFromIsbn = async (isbn: string): Promise<string | null> => {
    try {
      const response = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.works?.[0]?.key.replace('/works/', '');
    } catch (e) {
      console.error(`Failed to get work ID for ISBN ${isbn}`, e);
      return null;
    }
  };

  const handleImport = async () => {
    if (!user) {
      alert('Please log in to import your library from bookstr.');
      return;
    }

    setIsImporting(true);
    setImportCount(0);

    // 1. Fetch all shelf events
    const shelfEvents = await ndk.fetchEvents({
      kinds: [
        BOOKSTR_KINDS.BOOK_READ,
        BOOKSTR_KINDS.BOOK_READING,
        BOOKSTR_KINDS.BOOK_TBR,
      ],
      authors: [user.pubkey],
    });
    
    setTotalBooks(shelfEvents.size);
    if (shelfEvents.size === 0) {
      setIsImporting(false);
      alert("No books found on your bookstr shelves to import.");
      return;
    }

    // 2. Extract all unique ISBNs from shelf events
    const isbns = new Set<string>();
    for (const event of shelfEvents) {
      const isbn = event.tagValue('i')?.replace('isbn:', '') || event.tagValue('d');
      if (isbn) isbns.add(isbn);
    }

    // 3. Fetch all review events for those ISBNs in a single batch
    const reviewEvents = await ndk.fetchEvents({
      kinds: [BOOKSTR_KINDS.REVIEW],
      authors: [user.pubkey],
      '#d': Array.from(isbns).map(isbn => `isbn:${isbn}`),
    });

    // 4. Create a map for easy lookup of reviews by ISBN
    const reviewMap = new Map<string, NDKEvent>();
    for (const event of reviewEvents) {
      const isbn = event.tagValue('d')?.replace('isbn:', '');
      if (isbn) reviewMap.set(isbn, event);
    }

    // 5. Process each shelf event and create the new OpenBook event
    let publishedCount = 0;
    for (const event of shelfEvents) {
      const isbn = event.tagValue('i')?.replace('isbn:', '') || event.tagValue('d');
      if (!isbn) continue;

      const workId = await getWorkIdFromIsbn(isbn);
      if (!workId) {
        console.warn(`Skipping book with ISBN ${isbn} because no Open Library work ID was found.`);
        continue;
      }

      const openbookEvent = new NDKEvent(ndk);
      openbookEvent.kind = 30451 as NDKKind;
      openbookEvent.tags.push(['d', workId]);

      // Set status from the shelf event
      let status = '';
      if (event.kind === BOOKSTR_KINDS.BOOK_READ) status = 'read';
      else if (event.kind === BOOKSTR_KINDS.BOOK_READING) status = 'reading';
      else if (event.kind === BOOKSTR_KINDS.BOOK_TBR) status = 'want-to-read';
      openbookEvent.tags.push(['status', status]);

      // Check for a corresponding review and add its data
      const reviewEvent = reviewMap.get(isbn);
      if (reviewEvent) {
        openbookEvent.content = reviewEvent.content;
        const rating = reviewEvent.tagValue('rating');
        if (rating) {
          openbookEvent.tags.push(['rating', rating]);
        }
      }

      await openbookEvent.publish();
      publishedCount++;
      setImportCount(publishedCount);
    }

    setIsImporting(false);
    alert(`Import complete! ${publishedCount} of ${shelfEvents.size} books were imported.`);
  };

  return (
    <div>
      <button onClick={handleImport} disabled={isImporting}>
        {isImporting ? `Importing... (${importCount}/${totalBooks})` : 'Import from bookstr'}
      </button>
    </div>
  );
};

export default BookstrImport;
