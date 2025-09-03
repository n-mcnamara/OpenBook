import React from 'react';
import { Link } from 'react-router-dom';
import Login from '../auth/Login';
import { useUserStore } from '../../lib/store';

export default function Navbar() {
  const { user } = useUserStore();

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #ccc' }}>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/">Home</Link>
        <Link to="/search">Search</Link>
        <Link to="/discover">Discover</Link>
        {user && (
          <Link to={`/p/${user.pubkey}`}>My Shelves</Link>
        )}
      </div>
      <Login />
    </nav>
  );
}
