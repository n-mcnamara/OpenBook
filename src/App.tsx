import { useEffect } from 'react';
import ndk from './lib/ndk';
import { AppRoutes } from './router';
import Navbar from './components/layout/Navbar';
import './styles/App.css';

function App() {
  useEffect(() => {
    ndk.connect().catch((err) => console.error("NDK connection error:", err));
  }, []);

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