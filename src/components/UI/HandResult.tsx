import { useGameStore } from '../../store/gameStore';
import { useEffect, useRef } from 'react';
import { useAudio } from '../../hooks/useAudio';
import { useHaptics } from '../../hooks/useHaptics';
import './UI.css';

export function HandResult() {
  const currentHand = useGameStore((state) => state.currentHand);
  const lastWin = useGameStore((state) => state.lastWin);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const { playWin, playLose } = useAudio();
  const { vibrateWin, vibrateLose } = useHaptics();
  const hasPlayedSound = useRef(false);

  useEffect(() => {
    if (gamePhase === 'scoring' && !hasPlayedSound.current) {
      hasPlayedSound.current = true;
      if (lastWin > 0) {
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
  }, [gamePhase, lastWin, playWin, playLose, vibrateWin, vibrateLose]);

  if (!currentHand) return null;

  const isWin = lastWin > 0;

  return (
    <div className={`hand-result ${gamePhase === 'scoring' ? 'final' : ''} ${isWin ? 'win' : ''}`}>
      <div className="hand-name">{currentHand.displayName}</div>
      {gamePhase === 'scoring' && (
        <div className={`win-amount ${isWin ? 'positive' : 'negative'}`}>
          {isWin ? `+$${lastWin}` : 'No win'}
        </div>
      )}
      {gamePhase === 'scoring' && currentHand.payout > 0 && (
        <div className="payout-multiplier">{currentHand.payout}x payout</div>
      )}
    </div>
  );
}
