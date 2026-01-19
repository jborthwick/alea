import { useGameStore } from '../../store/gameStore';
import './UI.css';

export function BettingControls() {
  const currentBet = useGameStore((state) => state.currentBet);
  const bankroll = useGameStore((state) => state.bankroll);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const increaseBet = useGameStore((state) => state.increaseBet);
  const decreaseBet = useGameStore((state) => state.decreaseBet);
  const minBet = useGameStore((state) => state.minBet);
  const maxBet = useGameStore((state) => state.maxBet);

  const canIncrease = gamePhase === 'betting' && currentBet < maxBet && currentBet < bankroll;
  const canDecrease = gamePhase === 'betting' && currentBet > minBet;

  return (
    <div className="betting-controls">
      <div className="bet-label">BET</div>
      <div className="bet-amount-container">
        <button
          className="bet-button"
          onClick={decreaseBet}
          disabled={!canDecrease}
          aria-label="Decrease bet"
        >
          −
        </button>
        <span className="bet-amount">${currentBet}</span>
        <button
          className="bet-button"
          onClick={increaseBet}
          disabled={!canIncrease}
          aria-label="Increase bet"
        >
          +
        </button>
      </div>
    </div>
  );
}
