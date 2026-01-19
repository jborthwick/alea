import { useGameStore } from '../../store/gameStore';
import './UI.css';

export function ChipDisplay() {
  const bankroll = useGameStore((state) => state.bankroll);

  return (
    <div className="chip-display">
      <div className="chip-label">BANKROLL</div>
      <div className="chip-amount">${bankroll.toLocaleString()}</div>
    </div>
  );
}
