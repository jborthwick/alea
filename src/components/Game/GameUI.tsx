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
  const allHeld = useGameStore((state) => state.dice.every((d) => d.isHeld));
  const newRound = useGameStore((state) => state.newRound);
  const shakeEnabled = useGameStore((state) => state.shakeEnabled);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const { playRoll, initAudio } = useAudio();
  const { vibrateRoll } = useHaptics();

  const opponentIsRolling = useGameStore((state) => state.opponentIsRolling);
  const setIsShaking = useGameStore((state) => state.setIsShaking);

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

  const handleNewRound = useCallback(() => {
    initAudio();
    newRound();
  }, [initAudio, newRound]);

  // Hold-to-shake: track press state for cup-shake mechanic
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartRef = useRef<number>(0);
  const isShakingLocalRef = useRef(false);
  const [isShakingLocal, setIsShakingLocal] = useState(false);

  const handleRollPointerDown = useCallback((e: React.PointerEvent) => {
    // Only activate during rolling/betting phases when roll is possible
    if (gamePhase === 'scoring' || !canRoll) return;
    e.preventDefault();
    holdStartRef.current = performance.now();
    holdTimerRef.current = setTimeout(() => {
      isShakingLocalRef.current = true;
      setIsShakingLocal(true);
      setIsShaking(true);
    }, 150);
  }, [gamePhase, canRoll, setIsShaking]);

  const handleRollPointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (gamePhase === 'scoring') {
      if (currentBet === 0 || bankroll > 0) handleNewRound();
      return;
    }

    if (!canRoll) return;

    const wasShaking = isShakingLocalRef.current;
    isShakingLocalRef.current = false;
    setIsShakingLocal(false);
    setIsShaking(false);

    if (wasShaking) {
      // Scale intensity by hold duration: 150ms → 0.4, 1500ms+ → 1.0
      const held = performance.now() - holdStartRef.current;
      const intensity = Math.min(1.0, 0.4 + ((held - 150) / 1350) * 0.6);
      handleRoll(intensity);
    } else {
      // Short tap — normal roll
      handleRoll();
    }
  }, [gamePhase, canRoll, currentBet, bankroll, handleNewRound, handleRoll, setIsShaking]);

  const handleRollPointerLeave = useCallback(() => {
    // Cancel shake if pointer leaves button without releasing
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isShakingLocalRef.current) {
      isShakingLocalRef.current = false;
      setIsShakingLocal(false);
      setIsShaking(false);
    }
  }, [setIsShaking]);

  const { isSupported: shakeSupported, hasPermission, requestPermission } = useShakeDetection({
    onShake: (intensity) => {
      if (shakeEnabledRef.current && canRollRef.current) {
        handleRollRef.current(intensity);
      }
    },
  });

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
  } else if (gamePhase === 'rolling' && allHeld) {
    buttonText = 'HOLD';
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
          className={`roll-button ${!canRoll && gamePhase !== 'scoring' ? 'disabled' : ''} ${isShakingLocal ? 'shaking' : ''}`}
          onPointerDown={handleRollPointerDown}
          onPointerUp={handleRollPointerUp}
          onPointerLeave={handleRollPointerLeave}
          disabled={!canRoll && gamePhase !== 'scoring'}
          style={{ touchAction: 'none' }}
        >
          {buttonText}
        </button>

        <RollCounter />
      </div>

    </div>
  );
}
