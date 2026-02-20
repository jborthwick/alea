import { useGameStore } from '../../store/gameStore';
import { useEffect, useRef } from 'react';
import { useAudio } from '../../hooks/useAudio';
import { useHaptics } from '../../hooks/useHaptics';
import { evaluatePartialHand } from '../../game/handEvaluator';
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

// Player's hand display (shown at bottom near held/played dice)
export function PlayerHandDisplay() {
  const gamePhase = useGameStore((state) => state.gamePhase);
  const dice = useGameStore((state) => state.dice);
  const currentHand = useGameStore((state) => state.currentHand);

  if (gamePhase === 'betting') return null;

  // During scoring show the final evaluated hand for all 5 dice
  if (gamePhase === 'scoring') {
    if (!currentHand) return null;
    return (
      <div className="player-hand-display">
        <div className="hand-name">{currentHand.displayName}</div>
      </div>
    );
  }

  // During rolling show the partial hand of currently held dice
  const heldValues = dice.filter((d) => d.isHeld).map((d) => d.value);
  const heldHand = evaluatePartialHand(heldValues);
  if (!heldHand) return null;

  return (
    <div className="player-hand-display">
      <div className="hand-name">{heldHand.displayName}</div>
    </div>
  );
}

// Final result modal (shown in center during scoring)
export function HandResult() {
  const currentHand = useGameStore((state) => state.currentHand);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const roundOutcome = useGameStore((state) => state.roundOutcome);
  const lastWin = useGameStore((state) => state.lastWin);
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

  // Only show during scoring phase
  if (gamePhase !== 'scoring' || !roundOutcome || !currentHand) return null;

  const outcomeClass = roundOutcome === 'win' ? 'win' : roundOutcome === 'lose' ? 'lose' : 'tie';

  let payoutText = '';
  if (roundOutcome === 'win') {
    payoutText = `+$${lastWin.toLocaleString()}`;
  } else if (roundOutcome === 'lose' && currentBet > 0) {
    payoutText = `-$${currentBet.toLocaleString()}`;
  } else if (roundOutcome === 'tie') {
    payoutText = 'Push';
  }

  return (
    <div className={`hand-result final ${outcomeClass}`}>
      <div className={`outcome-text ${outcomeClass}`}>
        {roundOutcome === 'win' ? 'You win!' : roundOutcome === 'lose' ? 'Dealer wins!' : 'Push'}
      </div>
      {payoutText && (
        <div className={`payout-amount payout-amount--${outcomeClass}`}>
          {payoutText}
        </div>
      )}
    </div>
  );
}
