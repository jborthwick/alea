import { useGameStore } from '../../store/gameStore';
import { useRef, useState, useEffect } from 'react';
import './UI.css';

export function ChipDisplay() {
  const bankroll = useGameStore((state) => state.bankroll);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const roundOutcome = useGameStore((state) => state.roundOutcome);
  const lastWin = useGameStore((state) => state.lastWin);
  const currentBet = useGameStore((state) => state.currentBet);

  // Displayed bankroll — animated on scoring, snaps otherwise
  const [displayBankroll, setDisplayBankroll] = useState(bankroll);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(bankroll);

  // Snap display immediately when not in scoring phase
  useEffect(() => {
    if (gamePhase !== 'scoring') {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startTimeRef.current = null;
      setDisplayBankroll(bankroll);
    }
  }, [gamePhase, bankroll]);

  // Animate count-up/down when entering scoring
  useEffect(() => {
    if (gamePhase !== 'scoring') return;

    // Reconstruct pre-round bankroll (bankroll is already post-result)
    let preRound: number;
    if (roundOutcome === 'win') {
      preRound = bankroll - lastWin;
    } else if (roundOutcome === 'lose' && currentBet > 0) {
      preRound = bankroll + currentBet;
    } else {
      // Tie or free-table loss — no meaningful animation
      return;
    }

    if (preRound === bankroll) return;

    startValueRef.current = preRound;
    startTimeRef.current = null;
    setDisplayBankroll(preRound);

    const DURATION = 900;

    const tick = (now: number) => {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);
      // Cubic ease-out: snappy start, settles softly
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(startValueRef.current + (bankroll - startValueRef.current) * eased);
      setDisplayBankroll(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  // Only trigger when entering scoring phase
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase]);

  // Badge key — re-animates slide-in on each new scoring phase
  const scoringKeyRef = useRef(0);
  const prevPhaseRef = useRef(gamePhase);
  if (gamePhase === 'scoring' && prevPhaseRef.current !== 'scoring') {
    scoringKeyRef.current += 1;
  }
  prevPhaseRef.current = gamePhase;

  const showBadge = gamePhase === 'scoring' && roundOutcome !== null;

  let badgeText = '';
  let badgeClass = '';
  if (roundOutcome === 'win') {
    badgeText = `+$${lastWin.toLocaleString()}`;
    badgeClass = 'win';
  } else if (roundOutcome === 'lose') {
    badgeText = currentBet > 0 ? `-$${currentBet.toLocaleString()}` : '';
    badgeClass = 'lose';
  } else if (roundOutcome === 'tie') {
    badgeText = 'Push';
    badgeClass = 'tie';
  }

  return (
    <div className="chip-display">
      <div className="chip-label">BANKROLL</div>
      <div className="chip-amount-row">
        <div className="chip-amount">${displayBankroll.toLocaleString()}</div>
        {showBadge && badgeText && (
          <div
            key={scoringKeyRef.current}
            className={`chip-result-badge chip-result-badge--${badgeClass}`}
          >
            {badgeText}
          </div>
        )}
      </div>
    </div>
  );
}
