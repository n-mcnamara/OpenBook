import { useState } from 'react';
import BookCard from '../components/book/BookCard';
import '../styles/Card.css';

export interface Book {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [nostrBookIds, setNostrBookIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enhanceResultsWithNostrData = async (books: Book[]) => {
    const bookIds = books.map((book: Book) => book.key.replace('/works/', ''));
    const nostrEvents = await ndk.fetchEvents({
      kinds: [30452 as NDKKind],
      '#d': bookIds,
    });
    const foundIds = new Set<string>();
    for (const event of nostrEvents) {
      const dTag = event.tagValue('d');
      if (dTag) foundIds.add(dTag);
    }
    setNostrBookIds(foundIds);
  };

  const searchNostrByTitle = async (searchText: string) => {
    setError("Open Library is unavailable. Searching Nostr directly...");
    const normalizedQuery = searchText.toLowerCase().substring(0, 256);
    
    const nostrEvents = await ndk.fetchEvents({
      kinds: [30452 as NDKKind],
      '#title': [normalizedQuery],
    });

    if (nostrEvents.size === 0) {
      setError("No results found on Nostr for that exact title.");
      return;
    }

    const newResults: Book[] = [];
    const foundIds = new Set<string>();
    for (const event of nostrEvents) {
      try {
        const bookId = event.tagValue('d');
        if (bookId) {
          const content = JSON.parse(event.content);
          newResults.push({
            key: `/works/${bookId}`,
            title: content.title,
            author_name: [content.author],
            cover_i: content.cover ? parseInt(content.cover.split('/id/')[1].split('-')[0]) : undefined,
            first_publish_year: content.published_year ? parseInt(content.published_year) : undefined,
          });
          foundIds.add(bookId);
        }
      } catch (e) { console.error("Failed to parse Nostr event content", e); }
    }
    
    setResults(newResults);
    setNostrBookIds(foundIds);
    setError(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setIsLoading(true);
    setError(null);
    setResults([]);
    setNostrBookIds(new Set());

    try {
      const response = await fetch(`/api/search.json?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
      
      const data = await response.json();
      setResults(data.docs);
      setIsLoading(false);
      enhanceResultsWithNostrData(data.docs);

    } catch (err) {
      console.error(err);
      await searchNostrByTitle(query);
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for books by title or author..."
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}

      <div className="card-grid">
        {results.map((book) => {
          const bookId = book.key.replace('/works/', '');
          return (
            <BookCard
              key={book.key}
              book={book}
              isNostr={nostrBookIds.has(bookId)}
            />
          );
        })}
      </div>
    </div>
  );
}