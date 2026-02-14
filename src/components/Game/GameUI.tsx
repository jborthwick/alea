import { useState, useRef, useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ChipDisplay } from '../UI/ChipDisplay';
import { RollCounter } from '../UI/RollCounter';
import { HandResult, OpponentHandDisplay, PlayerHandDisplay } from '../UI/HandResult';
import { SettingsPanel } from '../UI/SettingsPanel';
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
  const shakeEnabled = useGameStore((state) => state.shakeEnabled);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const { playRoll, initAudio } = useAudio();
  const { vibrateRoll } = useHaptics();

  const opponentIsRolling = useGameStore((state) => state.opponentIsRolling);

  // Free table (bet === 0) can always roll; paid tables need sufficient bankroll
  const canRoll =
    !isRolling &&
    !opponentIsRolling &&
    rollsRemaining > 0 &&
    (gamePhase === 'betting' ? (currentBet === 0 || bankroll >= currentBet) : true);

  const handleRoll = useCallback((intensity?: number) => {
    initAudio();
    playRoll();
    vibrateRoll();
    onRoll(intensity);
  }, [initAudio, playRoll, vibrateRoll, onRoll]);

  // Use refs to always have access to current values (avoid stale closures)
  const canRollRef = useRef(canRoll);
  const handleRollRef = useRef(handleRoll);
  const shakeEnabledRef = useRef(shakeEnabled);
  useEffect(() => {
    canRollRef.current = canRoll;
    handleRollRef.current = handleRoll;
    shakeEnabledRef.current = shakeEnabled;
  });

  const { isSupported: shakeSupported, hasPermission, requestPermission } = useShakeDetection({
    onShake: (intensity) => {
      if (shakeEnabledRef.current && canRollRef.current) {
        handleRollRef.current(intensity);
      }
    },
  });

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
  if (gamePhase === 'scoring') {
    buttonText = (currentBet === 0 || bankroll > 0) ? 'NEW ROUND' : 'GAME OVER';
  } else if (rollsRemaining === 0) {
    buttonText = 'SCORE';
  }

  return (
    <div className="game-ui">
      {/* Top bar */}
      <div className="ui-top">
        <ChipDisplay />
        <OpponentHandDisplay />
        <button
          className="menu-button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>

      {/* Settings panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        shakeSupported={shakeSupported}
        shakePermission={hasPermission}
        onRequestShakePermission={handleRequestShakePermission}
      />

      {/* Center - Hand result */}
      <div className="ui-center">
        <HandResult />
      </div>

      {/* Bottom bar */}
      <div className="ui-bottom">
        <PlayerHandDisplay />

        <button
          className={`roll-button ${!canRoll && gamePhase !== 'scoring' ? 'disabled' : ''}`}
          onClick={() => {
            if (gamePhase === 'scoring') {
              if (currentBet === 0 || bankroll > 0) {
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

        <RollCounter />
      </div>

    </div>
  );
}
