import { useEffect } from 'react';
import ndk from './lib/ndk';
import { AppRoutes } from './router';
import Navbar from './components/layout/Navbar';

function App() {
  useEffect(() => {
    ndk.connect().catch((err) => console.error("NDK connection error:", err));
  }, []);

  return (
    <div className="App">
      <Navbar />
      <main>
        <AppRoutes />
      </main>
    </div>
  );
}

export default App;