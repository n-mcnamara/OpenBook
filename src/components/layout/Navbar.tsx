import { NavLink } from 'react-router-dom';
import Login from '../auth/Login';
import { useUserStore } from '../../lib/store';

export default function Navbar() {
  const { user } = useUserStore();

  return (
    <nav className="main-nav">
      <div className="nav-links">
        <NavLink to="/discover">Discover</NavLink>
        <NavLink to="/">Friends Feed</NavLink>
        <NavLink to="/search">Search</NavLink>
        {user && (
          <NavLink to={`/p/${user.pubkey}`}>My Shelves</NavLink>
        )}
      </div>
      <div className="nav-login">
        <Login />
      </div>
    </nav>
  );
}
