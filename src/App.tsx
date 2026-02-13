import { useState, useEffect } from 'react';
import { Game } from './components/Game/Game';
import { TableSelect } from './components/UI/TableSelect';
import { useGameStore, useStoreHydrated } from './store/gameStore';
import { preloadAllAssets } from './game/preloader';

function App() {
  const selectedTable = useGameStore((state) => state.selectedTable);
  const hydrated = useStoreHydrated();
  const [assetsReady, setAssetsReady] = useState(false);

  // Preload all assets (dice PNGs + table textures) once on startup
  useEffect(() => {
    preloadAllAssets().then(() => setAssetsReady(true));
  }, []);

  // Wait for both store hydration and asset preloading
  if (!hydrated || !assetsReady) return null;

  if (!selectedTable) {
    return <TableSelect />;
  }

  return <Game />;
}

export default App;
