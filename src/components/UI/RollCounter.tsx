import { useGameStore } from '../../store/gameStore';
import './UI.css';

export function RollCounter() {
  const rollsRemaining = useGameStore((state) => state.rollsRemaining);
  const gamePhase = useGameStore((state) => state.gamePhase);

  if (gamePhase === 'betting') {
    return (
      <div className="roll-counter">
        <div className="roll-label">ROLLS</div>
        <div className="roll-dots">
          {[0, 1, 2].map((i) => (
            <span key={i} className="roll-dot available" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="roll-counter">
      <div className="roll-label">ROLLS LEFT</div>
      <div className="roll-dots">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`roll-dot ${i < rollsRemaining ? 'available' : 'used'}`}
          />
        ))}
      </div>
    </div>
  );
}
