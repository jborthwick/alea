import { Game } from './components/Game/Game';
import { TableSelect } from './components/UI/TableSelect';
import { useGameStore, useStoreHydrated } from './store/gameStore';

function App() {
  const selectedTable = useGameStore((state) => state.selectedTable);
  const hydrated = useStoreHydrated();

  if (!hydrated) return null;

  if (!selectedTable) {
    return <TableSelect />;
  }

  return <Game />;
}

export default App;
