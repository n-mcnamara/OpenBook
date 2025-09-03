import React, { useState } from 'react';
import BookCard from '../components/book/BookCard';

// A basic type for the book data we get from Open Library
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setResults(data.docs);
    } catch (err) {
      setError('Failed to fetch books. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Search Books</h1>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for books by title or author..."
          style={{ width: '300px', marginRight: '10px' }}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {results.map((book) => (
          <BookCard key={book.key} book={book} />
        ))}
      </div>
    </div>
  );
}