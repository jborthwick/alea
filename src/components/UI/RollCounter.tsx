import { useGameStore } from '../../store/gameStore';
import './UI.css';

export function RollCounter() {
  const rollsRemaining = useGameStore((state) => state.rollsRemaining);
  const gamePhase = useGameStore((state) => state.gamePhase);

  return (
    <div className="roll-counter">
      <div className="roll-dots">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`roll-dot ${gamePhase === 'betting' || i < rollsRemaining ? 'available' : 'used'}`}
          />
        ))}
      </div>
    </div>
  );
}
