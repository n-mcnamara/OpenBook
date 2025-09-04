import { useEffect } from 'react';
import ndk from './lib/ndk';
import { AppRoutes } from './router';
import Navbar from './components/layout/Navbar';
import IncomingInviteHandler from './components/groups/IncomingInviteHandler';
import { useKeyManager } from './hooks/useKeyManager';
import './styles/App.css';

function App() {
  useEffect(() => {
    ndk.connect().catch((err) => console.error("NDK connection error:", err));
  }, []);

  // Initialize the key manager to listen for incoming shelf keys
  useKeyManager();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>OpenBook</h1>
          <p className="tagline">Your decentralized bookshelf.</p>
        </div>
      </header>
      <Navbar />
      <main>
        <AppRoutes />
      </main>
      <IncomingInviteHandler />
    </div>
  );
}

export default App;
