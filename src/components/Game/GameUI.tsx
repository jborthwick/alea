import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ChipDisplay } from '../UI/ChipDisplay';
import { RollCounter } from '../UI/RollCounter';
import { HandResult, OpponentHandDisplay, PlayerHandDisplay } from '../UI/HandResult';
import { SettingsPanel } from '../UI/SettingsPanel';
import { useAudio } from '../../hooks/useAudio';
import { useShakeDetection } from '../../hooks/useShakeDetection';
import { signalDiceReturningToPark } from '../Dice/Die';
import './GameUI.css';

interface GameUIProps {
  onRoll: (intensity?: number) => void;
  onNewRound: () => void;
}

export function GameUI({ onRoll, onNewRound }: GameUIProps) {
  const gamePhase = useGameStore((state) => state.gamePhase);
  const isRolling = useGameStore((state) => state.isRolling);
  const rollsRemaining = useGameStore((state) => state.rollsRemaining);
  const bankroll = useGameStore((state) => state.bankroll);
  const currentBet = useGameStore((state) => state.currentBet);
  const allHeld = useGameStore((state) => state.dice.every((d) => d.isHeld));
  const opponentIsRolling = useGameStore((state) => state.opponentIsRolling);
  const shakeEnabled = useGameStore((state) => state.shakeEnabled);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [roundFading, setRoundFading] = useState(false);

  const { initAudio } = useAudio();

  const canRoll =
    !isRolling &&
    !opponentIsRolling &&
    rollsRemaining > 0 &&
    (gamePhase === 'betting' ? (currentBet === 0 || bankroll >= currentBet) : true);

  // Keep refs current for shake detection callback
  const canRollRef = useRef(canRoll);
  const onRollRef = useRef(onRoll);
  const shakeEnabledRef = useRef(shakeEnabled);
  useEffect(() => {
    canRollRef.current = canRoll;
    onRollRef.current = onRoll;
    shakeEnabledRef.current = shakeEnabled;
  });

  const { isSupported: shakeSupported, hasPermission, requestPermission } = useShakeDetection({
    onShake: (intensity) => {
      if (shakeEnabledRef.current && canRollRef.current) {
        onRollRef.current(intensity);
      }
    },
  });

  const handleRequestShakePermission = async () => {
    initAudio();
    await requestPermission();
  };

  const handleNewRound = () => {
    initAudio();
    // Signal dice synchronously before any state change so useFrame blocks the
    // instant-park teleport on the very next frame (before useEffect can run).
    signalDiceReturningToPark();
    setRoundFading(true);
    setTimeout(() => {
      onNewRound();
      setRoundFading(false);
    }, 300);
  };

  // Contextual overlay: shown instead of the roll button when action is needed
  // that can't be triggered by a canvas tap (scoring, all-held score)
  const showScoreOverlay = gamePhase === 'rolling' && rollsRemaining === 0;
  const showAllHeldOverlay = gamePhase === 'rolling' && rollsRemaining > 0 && allHeld;
  const showNewRoundOverlay = gamePhase === 'scoring';

  const isGameOver = useGameStore((state) => state.currentBet > 0 && state.bankroll <= 0);

  return (
    <div className="game-ui">
      {/* Top bar */}
      <div className="ui-top">
        <ChipDisplay />
        <div className={roundFading ? 'round-fading' : ''}>
          <OpponentHandDisplay />
        </div>
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
      <div className={`ui-center${roundFading ? ' round-fading' : ''}`}>
        <HandResult />
      </div>

      {/* Contextual action overlay — only appears when a tap won't do */}
      {(showScoreOverlay || showAllHeldOverlay || showNewRoundOverlay) && (
        <div className="action-overlay">
          {showScoreOverlay && (
            <button className="action-button" onClick={() => onRoll()}>
              SCORE
            </button>
          )}
          {showAllHeldOverlay && (
            <button className="action-button" onClick={() => onRoll()}>
              HOLD ALL
            </button>
          )}
          {showNewRoundOverlay && (
            <button className="action-button" onClick={handleNewRound}>
              {isGameOver ? 'GAME OVER' : 'NEW ROUND'}
            </button>
          )}
        </div>
      )}

      {/* Player hand label — overlaid on the lower table area, above the dice tray */}
      <div className={`player-hand-overlay${roundFading ? ' round-fading' : ''}`}>
        <PlayerHandDisplay />
      </div>

      {/* Bottom — roll counter dots */}
      <div className="ui-bottom">
        <RollCounter />
      </div>
    </div>
  );
}
