import { useState, useRef, useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ChipDisplay } from '../UI/ChipDisplay';
import { RollCounter } from '../UI/RollCounter';
import { HandResult, OpponentHandDisplay, PlayerHandDisplay } from '../UI/HandResult';
import { PayoutTable } from '../UI/PayoutTable';
import { SettingsPanel } from '../UI/SettingsPanel';
import { useAudio } from '../../hooks/useAudio';
import { useHaptics } from '../../hooks/useHaptics';
import { useShakeDetection } from '../../hooks/useShakeDetection';
import { TABLE_CONFIGS } from '../../game/constants';
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
  const selectedTable = useGameStore((state) => state.selectedTable);
  const newRound = useGameStore((state) => state.newRound);
  const returnToLobby = useGameStore((state) => state.returnToLobby);
  const shakeEnabled = useGameStore((state) => state.shakeEnabled);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

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

  const tableName = selectedTable ? TABLE_CONFIGS[selectedTable].name : '';
  const tableBetLabel = selectedTable
    ? (TABLE_CONFIGS[selectedTable].bet === 0 ? 'Free' : `$${TABLE_CONFIGS[selectedTable].bet}`)
    : '';

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
        <div className="top-left">
          <button
            className="back-button"
            onClick={returnToLobby}
            aria-label="Back to table select"
          >
            ←
          </button>
          <div className="table-info">
            <span className="table-info-name">{tableName}</span>
            <span className="table-info-bet">{tableBetLabel}</span>
          </div>
        </div>
        <OpponentHandDisplay />
        <div className="top-right">
          <ChipDisplay />
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

      {/* Payout table (collapsible on mobile) */}
      <div className="payout-container">
        <PayoutTable />
      </div>
    </div>
  );
}
