import { useGameStore } from '../../store/gameStore';
import { useEffect, useRef } from 'react';
import { useAudio } from '../../hooks/useAudio';
import { useHaptics } from '../../hooks/useHaptics';
import './UI.css';

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

  if (!currentHand) return null;

  // During rolling phase: show both developing hands
  if (gamePhase === 'rolling') {
    return (
      <div className="hand-result">
        {opponentHand && (
          <div className="opponent-hand-preview">
            {opponentHand.displayName} vs.
          </div>
        )}
        <div className="hand-name">{currentHand.displayName}</div>
      </div>
    );
  }

  // During scoring: show full comparison with outcome
  if (gamePhase === 'scoring' && roundOutcome) {
    const outcomeClass = roundOutcome === 'win' ? 'win' : roundOutcome === 'lose' ? 'lose' : 'tie';

    return (
      <div className={`hand-result final ${outcomeClass}`}>
        <div className="hand-comparison-row">
          <div className="hand-comparison opponent">
            <div className="hand-name">{opponentHand?.displayName}</div>
          </div>
          <div className="vs-divider">vs</div>
          <div className="hand-comparison player">
            <div className="hand-name">{currentHand.displayName}</div>
          </div>
        </div>
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
      </div>
    );
  }

  return null;
}
