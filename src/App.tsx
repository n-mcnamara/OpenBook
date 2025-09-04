import { useEffect } from 'react';
import ndk from './lib/ndk';
import { AppRoutes } from './router';
import Navbar from './components/layout/Navbar';
import { useKeyManager } from './hooks/useKeyManager';
import { createAsciiFavicon } from './lib/favicon';
import './styles/App.css';

const ICON = `_ __
/ |/ |
| |  |
|_|__|_|`;

function App() {
  useEffect(() => {
    ndk.connect().catch((err) => console.error("NDK connection error:", err));

    // Set the favicon
    const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (favicon) {
      favicon.href = createAsciiFavicon(ICON, '#e58c42', '#2a3a3a');
    }
    
    // Set the title
    document.title = `OpenBook`;
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
    </div>
  );
}

export default App;
