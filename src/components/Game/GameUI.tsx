import { useState, useRef, useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ChipDisplay } from '../UI/ChipDisplay';
import { RollCounter } from '../UI/RollCounter';
import { HandResult, OpponentHandDisplay, PlayerHandDisplay } from '../UI/HandResult';
import { SettingsPanel } from '../UI/SettingsPanel';
import { useAudio } from '../../hooks/useAudio';
import { useHaptics } from '../../hooks/useHaptics';
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
  const setIsShaking = useGameStore((state) => state.setIsShaking);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [roundFading, setRoundFading] = useState(false);
  const [isShakingLocal, setIsShakingLocal] = useState(false);

  const { playRoll, initAudio } = useAudio();
  const { vibrateRoll } = useHaptics();

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

  // Keep refs current for shake detection callback
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

  // Hold-to-shake: track press state for cup-shake mechanic
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartRef = useRef<number>(0);
  const isShakingLocalRef = useRef(false);

  const handleRollPointerDown = useCallback((e: React.PointerEvent) => {
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
      handleNewRound();
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
      handleRoll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase, canRoll, handleRoll, setIsShaking]);

  const handleRollPointerLeave = useCallback(() => {
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

      {/* Player hand label — overlaid on the lower table area, above the dice tray */}
      <div className={`player-hand-overlay${roundFading ? ' round-fading' : ''}`}>
        <PlayerHandDisplay />
      </div>

      {/* Bottom — roll button + roll counter dots */}
      <div className="ui-bottom">
        <button
          className={`action-button${!canRoll && gamePhase !== 'scoring' ? ' disabled' : ''}${isShakingLocal ? ' shaking' : ''}`}
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
