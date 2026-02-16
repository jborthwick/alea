import { Vector2, Vector3 } from 'three';
import {
  MIN_ANGULAR_VELOCITY,
  MAX_ANGULAR_VELOCITY,
  BASE_IMPULSE,
  IMPULSE_VARIANCE,
} from '../game/constants';

export interface RollImpulse {
  linearImpulse: Vector3;
  angularImpulse: Vector3;
  startPosition: Vector3;
}

/**
 * Generates random roll parameters for a die.
 * @param intensity - Roll intensity from 0-1 (e.g., shake strength)
 * @param dieIndex - Index of the die (for position spread)
 */
export function calculateRollImpulse(
  intensity: number = 0.7,
  dieIndex: number = 0
): RollImpulse {
  // Clamp intensity
  const clampedIntensity = Math.max(0.3, Math.min(1, intensity));

  // Calculate angular velocity magnitude
  const angularMagnitude =
    MIN_ANGULAR_VELOCITY +
    (MAX_ANGULAR_VELOCITY - MIN_ANGULAR_VELOCITY) * clampedIntensity;

  // Random angular impulse on all axes
  const angularImpulse = new Vector3(
    (Math.random() - 0.5) * 2 * angularMagnitude,
    (Math.random() - 0.5) * 2 * angularMagnitude,
    (Math.random() - 0.5) * 2 * angularMagnitude
  );

  // Linear impulse with variance
  const baseImpulse = BASE_IMPULSE * clampedIntensity;
  const variance = 1 + (Math.random() - 0.5) * IMPULSE_VARIANCE;

  // Throw dice with good horizontal spread and backward momentum (away from camera/upward on screen)
  const linearImpulse = new Vector3(
    (Math.random() - 0.5) * baseImpulse * 0.5,  // Horizontal X spread
    baseImpulse * 0.35,                          // Good upward arc for bounces
    -(Math.random() * 0.5 + 0.3) * baseImpulse  // Negative Z = backward/upward on screen
  ).multiplyScalar(variance);

  // Start position: spread across the table, above the surface, closer to front
  const spreadX = (dieIndex - 2) * 0.8 + (Math.random() - 0.5) * 0.4;
  const spreadZ = 1.0 + Math.random() * 0.5; // Start near front (positive Z = toward camera)
  const startPosition = new Vector3(spreadX, 2.5 + Math.random() * 0.5, spreadZ);

  return {
    linearImpulse,
    angularImpulse,
    startPosition,
  };
}

/**
 * Generates roll parameters from a grab-and-throw gesture.
 * Unlike calculateRollImpulse, the throw direction comes from the user's flick
 * rather than being random. Angular impulse is still random for natural tumbling.
 *
 * @param intensity - Throw intensity 0-1 (from flick speed)
 * @param direction - Normalized 2D screen-space direction of the flick.
 *   Screen coords: X+ = right, Y+ = down. So flick up = (0, -1).
 *   Maps to world: X → X, screen-Y → world-Z (negative Y → negative Z = back of table).
 * @param dieIndex - Index of the die (for position spread)
 * @param startPos - Optional current 3D position of the die (from grab hover)
 */
export function calculateThrowImpulse(
  intensity: number,
  direction: Vector2,
  dieIndex: number,
  startPos?: Vector3,
): RollImpulse {
  const clampedIntensity = Math.max(0.3, Math.min(1, intensity));

  // Angular: same random tumbling as a regular roll
  const angularMagnitude =
    MIN_ANGULAR_VELOCITY +
    (MAX_ANGULAR_VELOCITY - MIN_ANGULAR_VELOCITY) * clampedIntensity;

  const angularImpulse = new Vector3(
    (Math.random() - 0.5) * 2 * angularMagnitude,
    (Math.random() - 0.5) * 2 * angularMagnitude,
    (Math.random() - 0.5) * 2 * angularMagnitude
  );

  // Linear: map 2D flick direction to 3D world impulse
  const baseImpulse = BASE_IMPULSE * clampedIntensity;
  const variance = 1 + (Math.random() - 0.5) * IMPULSE_VARIANCE;

  const linearImpulse = new Vector3(
    direction.x * baseImpulse * 1.0,   // Screen X → World X (full directional energy)
    baseImpulse * 0.45,                 // Upward arc (slightly higher for satisfying bounce)
    direction.y * baseImpulse * 1.1     // Screen Y → World Z (neg = back of table)
  ).multiplyScalar(variance);

  // Start position: use current grab position if provided, else default spread
  const spreadX = (dieIndex - 2) * 0.8 + (Math.random() - 0.5) * 0.3;
  const startPosition = startPos
    ? startPos.clone()
    : new Vector3(spreadX, 2.0, 1.2);

  return { linearImpulse, angularImpulse, startPosition };
}

/**
 * Calculates impulse based on drag gesture (desktop).
 * @param dragVelocity - Velocity vector from drag end
 * @param dieIndex - Index of the die
 */
export function calculateDragImpulse(
  dragVelocity: Vector3,
  dieIndex: number
): RollImpulse {
  // Map drag velocity to intensity (0-1)
  const speed = dragVelocity.length();
  const intensity = Math.min(1, speed / 500); // 500px/s = max intensity

  return calculateRollImpulse(intensity, dieIndex);
}

/**
 * Calculates impulse based on device shake (mobile).
 * @param accelerationMagnitude - Magnitude of acceleration
 * @param dieIndex - Index of the die
 */
export function calculateShakeImpulse(
  accelerationMagnitude: number,
  dieIndex: number
): RollImpulse {
  // Map shake magnitude to intensity
  // Typical shake: 15-40 m/s², resting with gravity: ~9.8
  const shakeStrength = Math.max(0, accelerationMagnitude - 9.8);
  const intensity = Math.min(1, shakeStrength / 30);

  return calculateRollImpulse(intensity, dieIndex);
}
