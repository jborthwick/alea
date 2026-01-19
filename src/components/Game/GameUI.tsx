import { useGameStore } from '../../store/gameStore';
import { BettingControls } from '../UI/BettingControls';
import { ChipDisplay } from '../UI/ChipDisplay';
import { RollCounter } from '../UI/RollCounter';
import { HandResult } from '../UI/HandResult';
import { PayoutTable } from '../UI/PayoutTable';
import { useAudio } from '../../hooks/useAudio';
import { useHaptics } from '../../hooks/useHaptics';
import { useShakeDetection } from '../../hooks/useShakeDetection';
import './GameUI.css';

interface GameUIProps {
  onRoll: (intensity?: number) => void;
}

export function GameUI({ onRoll }: GameUIProps) {
  const gamePhase = useGameStore((state) => state.gamePhase);
  const isRolling = useGameStore((state) => state.isRolling);
  const rollsRemaining = useGameStore((state) => state.rollsRemaining);
  const bankroll = useGameStore((state) => state.bankroll);
  const currentBet = useGameStore((state) => state.currentBet);
  const newRound = useGameStore((state) => state.newRound);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const toggleSound = useGameStore((state) => state.toggleSound);

  const { playRoll, initAudio } = useAudio();
  const { vibrateRoll } = useHaptics();
  const { isSupported: shakeSupported, hasPermission, requestPermission } = useShakeDetection({
    onShake: (intensity) => {
      if (canRoll) {
        handleRoll(intensity);
      }
    },
  });

  const canRoll =
    !isRolling &&
    rollsRemaining > 0 &&
    (gamePhase === 'betting' ? bankroll >= currentBet : true);

  const handleRoll = (intensity?: number) => {
    initAudio();
    playRoll();
    vibrateRoll();
    onRoll(intensity);
  };

  const handleNewRound = () => {
    initAudio();
    newRound();
  };

  const handleRequestShakePermission = async () => {
    initAudio();
    await requestPermission();
  };

  // Determine button text
  let buttonText = 'ROLL';
  if (gamePhase === 'betting') {
    buttonText = 'PLACE BET & ROLL';
  } else if (gamePhase === 'scoring') {
    buttonText = bankroll > 0 ? 'NEW ROUND' : 'GAME OVER';
  } else if (rollsRemaining === 0) {
    buttonText = 'SCORE';
  }

  return (
    <div className="game-ui">
      {/* Top bar */}
      <div className="ui-top">
        <ChipDisplay />
        <RollCounter />
        <button
          className="sound-toggle"
          onClick={toggleSound}
          aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Center - Hand result */}
      <div className="ui-center">
        <HandResult />
      </div>

      {/* Bottom bar */}
      <div className="ui-bottom">
        {gamePhase === 'betting' && <BettingControls />}

        <button
          className={`roll-button ${!canRoll && gamePhase !== 'scoring' ? 'disabled' : ''}`}
          onClick={() => {
            if (gamePhase === 'scoring') {
              if (bankroll > 0) {
                handleNewRound();
              }
            } else if (canRoll) {
              handleRoll();
            }
          }}
          disabled={!canRoll && gamePhase !== 'scoring'}
        >
          {buttonText}
        </button>

        {/* Shake permission request for mobile */}
        {shakeSupported && hasPermission === null && (
          <button
            className="shake-permission-button"
            onClick={handleRequestShakePermission}
          >
            Enable Shake to Roll
          </button>
        )}

        {shakeSupported && hasPermission && gamePhase !== 'scoring' && (
          <div className="shake-hint">Shake your device to roll!</div>
        )}
      </div>

      {/* Payout table (collapsible on mobile) */}
      <div className="payout-container">
        <PayoutTable />
      </div>
    </div>
  );
}
