import { useGameStore } from '../../store/gameStore';
import { useEffect, useRef, useState } from 'react';
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

// Final result modal (shown in center during scoring)
export function HandResult() {
  const currentHand = useGameStore((state) => state.currentHand);
  const opponentHand = useGameStore((state) => state.opponentHand);
  const lastWin = useGameStore((state) => state.lastWin);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const roundOutcome = useGameStore((state) => state.roundOutcome);
  const currentBet = useGameStore((state) => state.currentBet);
  const { playWin, playLose } = useAudio();
  const { vibrateWin, vibrateLose } = useHaptics();
  const hasPlayedSound = useRef(false);
  const [showOutcome, setShowOutcome] = useState(false);

  useEffect(() => {
    if (gamePhase === 'scoring' && !hasPlayedSound.current) {
      hasPlayedSound.current = true;

      // Delay showing the outcome message by 1.5 seconds
      const outcomeTimer = setTimeout(() => {
        setShowOutcome(true);
      }, 1500);

      // Play sound/haptics immediately
      if (roundOutcome === 'win') {
        playWin();
        vibrateWin();
      } else {
        playLose();
        vibrateLose();
      }

      return () => clearTimeout(outcomeTimer);
    }

    if (gamePhase !== 'scoring') {
      hasPlayedSound.current = false;
      setShowOutcome(false);
    }
  }, [gamePhase, roundOutcome, playWin, playLose, vibrateWin, vibrateLose]);

  // Only show during scoring phase
  if (gamePhase !== 'scoring' || !roundOutcome || !currentHand) return null;

  const outcomeClass = roundOutcome === 'win' ? 'win' : roundOutcome === 'lose' ? 'lose' : 'tie';

  return (
    <div className={`hand-result final ${outcomeClass} ${showOutcome ? 'expanded' : ''}`}>
      <div className="hand-comparison-row">
        <div className="hand-comparison opponent">
          <div className="hand-name">{opponentHand?.displayName}</div>
        </div>
        <div className="vs-divider">vs</div>
        <div className="hand-comparison player">
          <div className="hand-name">{currentHand.displayName}</div>
        </div>
      </div>
      {showOutcome && (
        <>
          <div className={`outcome-text ${outcomeClass}`}>
            {roundOutcome === 'win' ? 'YOU WIN!' : roundOutcome === 'lose' ? 'YOU LOSE' : 'PUSH'}
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
        </>
      )}
    </div>
  );
}
