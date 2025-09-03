import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import ProfilePage from '../pages/ProfilePage';
import SearchPage from '../pages/SearchPage';
import BookDetailsPage from '../pages/BookDetailsPage';
import DiscoverPage from '../pages/DiscoverPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/discover" element={<DiscoverPage />} />
      <Route path="/p/:pubkey" element={<ProfilePage />} />
      <Route path="/book/:bookId" element={<BookDetailsPage />} />
    </Routes>
  );
}
