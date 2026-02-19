import { useGameStore } from '../../store/gameStore';
import { useEffect, useRef } from 'react';
import { useAudio } from '../../hooks/useAudio';
import { useHaptics } from '../../hooks/useHaptics';
import './UI.css';

// Opponent's hand display (shown at top near opponent dice)
export function OpponentHandDisplay() {
  const opponentHand = useGameStore((state) => state.opponentHand);
  const gamePhase = useGameStore((state) => state.gamePhase);

  if (!opponentHand || gamePhase === 'betting') return null;

  return (
    <div className="opponent-hand-display">
      <div className="hand-name">{opponentHand.displayName}</div>
    </div>
  );
}

// Player's hand display (shown at bottom near held dice)
export function PlayerHandDisplay() {
  const currentHand = useGameStore((state) => state.currentHand);
  const gamePhase = useGameStore((state) => state.gamePhase);

  if (!currentHand || gamePhase === 'betting') return null;

  return (
    <div className="player-hand-display">
      <div className="hand-name">{currentHand.displayName}</div>
    </div>
  );
}

interface HandResultProps {
  onNewRound: () => void;
}

// Final result modal (shown in center during scoring)
export function HandResult({ onNewRound }: HandResultProps) {
  const currentHand = useGameStore((state) => state.currentHand);
  const lastWin = useGameStore((state) => state.lastWin);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const roundOutcome = useGameStore((state) => state.roundOutcome);
  const currentBet = useGameStore((state) => state.currentBet);
  const bankroll = useGameStore((state) => state.bankroll);
  const { playWin, playLose } = useAudio();
  const { vibrateWin, vibrateLose } = useHaptics();
  const hasPlayedSound = useRef(false);

  useEffect(() => {
    if (gamePhase === 'scoring' && !hasPlayedSound.current) {
      hasPlayedSound.current = true;

      if (roundOutcome === 'win') {
        playWin();
        vibrateWin();
      } else {
        playLose();
        vibrateLose();
      }
    }

    if (gamePhase !== 'scoring') {
      hasPlayedSound.current = false;
    }
  }, [gamePhase, roundOutcome, playWin, playLose, vibrateWin, vibrateLose]);

  // Only show during scoring phase
  if (gamePhase !== 'scoring' || !roundOutcome || !currentHand) return null;

  const outcomeClass = roundOutcome === 'win' ? 'win' : roundOutcome === 'lose' ? 'lose' : 'tie';
  const isGameOver = currentBet > 0 && bankroll <= 0;

  return (
    <div className={`hand-result final expanded ${outcomeClass}`}>
      <div className={`outcome-text ${outcomeClass}`}>
        {roundOutcome === 'win' ? 'You win!' : roundOutcome === 'lose' ? 'Dealer wins!' : 'Push'}
      </div>
      {roundOutcome === 'win' && (
        <div className="win-amount positive">+${lastWin}</div>
      )}
      {roundOutcome === 'tie' && (
        <div className="win-amount tie">Bet returned</div>
      )}
      {roundOutcome === 'lose' && (
        <div className="win-amount negative">-${currentBet}</div>
      )}
      <button className="action-button result-new-round-button" onClick={onNewRound}>
        {isGameOver ? 'GAME OVER' : 'NEW ROUND'}
      </button>
    </div>
  );
}
