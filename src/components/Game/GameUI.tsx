import { useState, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BettingControls } from '../UI/BettingControls';
import { ChipDisplay } from '../UI/ChipDisplay';
import { RollCounter } from '../UI/RollCounter';
import { HandResult, OpponentHandDisplay, PlayerHandDisplay } from '../UI/HandResult';
import { PayoutTable } from '../UI/PayoutTable';
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
  const [infoOpen, setInfoOpen] = useState(false);

  const { playRoll, initAudio } = useAudio();
  const { vibrateRoll } = useHaptics();

  const opponentIsRolling = useGameStore((state) => state.opponentIsRolling);

  const canRoll =
    !isRolling &&
    !opponentIsRolling &&
    rollsRemaining > 0 &&
    (gamePhase === 'betting' ? bankroll >= currentBet : true);

  const handleRoll = useCallback((intensity?: number) => {
    initAudio();
    playRoll();
    vibrateRoll();
    onRoll(intensity);
  }, [initAudio, playRoll, vibrateRoll, onRoll]);

  // Use refs to always have access to current values (avoid stale closures)
  const canRollRef = useRef(canRoll);
  canRollRef.current = canRoll;
  const handleRollRef = useRef(handleRoll);
  handleRollRef.current = handleRoll;
  const shakeEnabledRef = useRef(shakeEnabled);
  shakeEnabledRef.current = shakeEnabled;

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
        <OpponentHandDisplay />
        <div className="top-buttons">
          <button
            className="info-button"
            onClick={() => setInfoOpen(true)}
            aria-label="Show hand rankings"
          >
            ℹ️
          </button>
          <button
            className="settings-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Settings panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        shakeSupported={shakeSupported}
        shakePermission={hasPermission}
        onRequestShakePermission={handleRequestShakePermission}
      />

      {/* Info overlay (hand rankings for mobile) */}
      {infoOpen && (
        <div className="info-overlay" onClick={() => setInfoOpen(false)}>
          <div className="info-panel" onClick={(e) => e.stopPropagation()}>
            <PayoutTable />
            <button className="info-close" onClick={() => setInfoOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Center - Hand result */}
      <div className="ui-center">
        <HandResult />
      </div>

      {/* Bottom bar */}
      <div className="ui-bottom">
        <PlayerHandDisplay />
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

        <RollCounter />
      </div>

      {/* Payout table (collapsible on mobile) */}
      <div className="payout-container">
        <PayoutTable />
      </div>
    </div>
  );
}
