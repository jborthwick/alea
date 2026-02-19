import { useCallback, useRef, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Types ───────────────────────────────────────────────────────────────────

type GesturePhase = 'idle' | 'pressing' | 'grabbing';

interface PointerSample {
  x: number;   // clientX
  y: number;   // clientY
  time: number; // performance.now()
}

interface UseGrabAndThrowOptions {
  canRoll: boolean;
  hasNonHeldDice: boolean;
  onGrabStart?: () => void;
  onThrow: (intensity: number, direction: THREE.Vector2) => void;
  onTap?: () => void;        // short press without movement — triggers a roll
  onHoldStart?: () => void;  // hold timer fired but no dice nearby — cup shake start
  onHoldEnd?: () => void;    // pointer released after hold without grab — cup shake end
}

interface UseGrabAndThrowResult {
  gesturePhase: GesturePhase;
  grabTargetRef: React.RefObject<THREE.Vector3 | null>;
  handlePointerDown: (worldPoint: THREE.Vector3, clientX: number, clientY: number, pointerId: number) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HOLD_TIMER_MS = 200;        // ms to hold before grab activates
const MOVE_CANCEL_PX = 10;        // px movement cancels hold
const FLICK_WINDOW_MS = 100;      // sample window for velocity calc
const MAX_SPEED_FOR_INTENSITY = 600;  // px/s maps to intensity 1.0 (lower = easier to throw hard)
const MIN_INTENSITY = 0.4;
const GRAB_HOVER_Y = 2.0;         // Y plane for screen-to-world raycast during grab

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGrabAndThrow({
  canRoll,
  hasNonHeldDice,
  onGrabStart,
  onThrow,
  onTap,
  onHoldStart,
  onHoldEnd,
}: UseGrabAndThrowOptions): UseGrabAndThrowResult {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  const [gesturePhase, setGesturePhase] = useState<GesturePhase>('idle');
  const grabTargetRef = useRef<THREE.Vector3 | null>(null);

  // Refs for gesture state (don't trigger re-renders)
  const phaseRef = useRef<GesturePhase>('idle');
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startClientRef = useRef({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);
  const samplesRef = useRef<PointerSample[]>([]);
  const canRollRef = useRef(canRoll);
  const hasNonHeldDiceRef = useRef(hasNonHeldDice);
  const pressMoveRef = useRef<((e: PointerEvent) => void) | null>(null);
  const pressUpRef = useRef<((e: PointerEvent) => void) | null>(null);

  // Reusable Three.js objects for screenToWorld (avoid GC pressure on every pointermove)
  const raycastState = useRef({
    ndc: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -GRAB_HOVER_Y),
    target: new THREE.Vector3(),
  });

  // Keep refs in sync
  useEffect(() => {
    canRollRef.current = canRoll;
  }, [canRoll]);
  useEffect(() => {
    hasNonHeldDiceRef.current = hasNonHeldDice;
  }, [hasNonHeldDice]);

  // ── Screen → world raycast ───────────────────────────────────────────────

  const screenToWorld = useCallback(
    (clientX: number, clientY: number): THREE.Vector3 => {
      const { ndc, raycaster, plane, target } = raycastState.current;
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      raycaster.ray.intersectPlane(plane, target);
      return target;
    },
    [camera, gl],
  );

  // ── Cleanup helper ───────────────────────────────────────────────────────

  const reset = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    pointerIdRef.current = null;
    samplesRef.current = [];
    phaseRef.current = 'idle';
    setGesturePhase('idle');
    grabTargetRef.current = null;
  }, []);

  // ── Window-level pointer handlers (registered during grab) ───────────────

  const handleWindowMove = useCallback(
    (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return;

      // Record sample
      samplesRef.current.push({ x: e.clientX, y: e.clientY, time: performance.now() });
      // Keep last 10 samples
      if (samplesRef.current.length > 10) samplesRef.current.shift();

      // Update grab target (ref — no re-render, read in useFrame)
      const world = screenToWorld(e.clientX, e.clientY);
      if (!grabTargetRef.current) {
        grabTargetRef.current = world.clone();
      } else {
        grabTargetRef.current.copy(world);
      }
    },
    [screenToWorld],
  );

  const handleWindowUp = useCallback(
    (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return;

      if (phaseRef.current === 'grabbing') {
        // Calculate flick velocity
        const now = performance.now();
        const recent = samplesRef.current.filter((s) => s.time > now - FLICK_WINDOW_MS);

        let intensity = MIN_INTENSITY;
        let direction = new THREE.Vector2(0, -1); // default: throw backward

        if (recent.length >= 2) {
          const first = recent[0];
          const last = recent[recent.length - 1];
          const dt = (last.time - first.time) / 1000;
          if (dt > 0.001) {
            const vx = (last.x - first.x) / dt;
            const vy = (last.y - first.y) / dt;
            const speed = Math.sqrt(vx * vx + vy * vy);

            intensity = Math.min(1, Math.max(MIN_INTENSITY, speed / MAX_SPEED_FOR_INTENSITY));

            const dirLen = Math.sqrt(vx * vx + vy * vy);
            if (dirLen > 1) {
              direction = new THREE.Vector2(vx / dirLen, vy / dirLen);
            }
          }
        }

        onThrow(intensity, direction);
      }

      // Clean up window listeners
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      reset();
    },
    [onThrow, handleWindowMove, reset],
  );

  // ── Pointer down (called from GrabGestureLayer's hit plane) ──────────────

  const handlePointerDown = useCallback(
    (worldPoint: THREE.Vector3, clientX: number, clientY: number, pointerId: number) => {
      // Ignore if already active, can't roll, or no dice to grab
      if (phaseRef.current !== 'idle') return;
      if (!canRollRef.current || !hasNonHeldDiceRef.current) return;

      phaseRef.current = 'pressing';
      setGesturePhase('pressing');
      pointerIdRef.current = pointerId;
      startClientRef.current = { x: clientX, y: clientY };
      samplesRef.current = [{ x: clientX, y: clientY, time: performance.now() }];

      // Start hold timer
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;

        // Remove press-phase listeners before anything else
        if (pressMoveRef.current) {
          window.removeEventListener('pointermove', pressMoveRef.current);
          pressMoveRef.current = null;
        }
        if (pressUpRef.current) {
          window.removeEventListener('pointerup', pressUpRef.current);
          pressUpRef.current = null;
        }

        // Re-check canRoll at timer fire time
        if (!canRollRef.current) {
          reset();
          return;
        }

        // If all dice are held, no dice to grab — use hold as cup-shake instead
        if (!hasNonHeldDiceRef.current) {
          phaseRef.current = 'grabbing'; // reuse phase to block other gestures
          setGesturePhase('grabbing');
          onHoldStart?.();
          // Release handler will call onHoldEnd and reset
          const onShakeUp = (e: PointerEvent) => {
            if (e.pointerId !== pointerIdRef.current) return;
            window.removeEventListener('pointerup', onShakeUp);
            onHoldEnd?.();
            reset();
          };
          window.addEventListener('pointerup', onShakeUp);
          return;
        }

        // Transition to grabbing
        phaseRef.current = 'grabbing';
        setGesturePhase('grabbing');
        grabTargetRef.current = worldPoint.clone();
        onGrabStart?.();

        // Register window-level tracking
        window.addEventListener('pointermove', handleWindowMove);
        window.addEventListener('pointerup', handleWindowUp);
      }, HOLD_TIMER_MS);

      // Temporary move/up handlers on window to detect cancel during pressing
      const onPressMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerIdRef.current) return;
        const dx = e.clientX - startClientRef.current.x;
        const dy = e.clientY - startClientRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL_PX) {
          // Too much movement — cancel
          window.removeEventListener('pointermove', onPressMove);
          window.removeEventListener('pointerup', onPressUp);
          pressMoveRef.current = null;
          pressUpRef.current = null;
          reset();
        }
      };
      const onPressUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerIdRef.current) return;
        // Released before hold timer — treat as a tap → trigger roll
        window.removeEventListener('pointermove', onPressMove);
        window.removeEventListener('pointerup', onPressUp);
        pressMoveRef.current = null;
        pressUpRef.current = null;
        reset();
        if (canRollRef.current) onTap?.();
      };

      // Store refs so the hold timer can remove them on transition to grabbing
      pressMoveRef.current = onPressMove;
      pressUpRef.current = onPressUp;

      window.addEventListener('pointermove', onPressMove);
      window.addEventListener('pointerup', onPressUp);
    },
    [onGrabStart, onTap, onHoldStart, onHoldEnd, handleWindowMove, handleWindowUp, reset],
  );

  // Cancel gesture if canRoll becomes false during grab
  useEffect(() => {
    if (!canRoll && phaseRef.current === 'grabbing') {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      reset();
    }
  }, [canRoll, handleWindowMove, handleWindowUp, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
    };
  }, [handleWindowMove, handleWindowUp]);

  return { gesturePhase, grabTargetRef, handlePointerDown };
}
