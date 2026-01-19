import { Quaternion, Vector3, Euler } from 'three';
import type { CardValue } from '../types/game';

// Face mapping: which face is up based on the dominant axis
// When we create the die, face 0 (+Y) shows '9', face 1 (-Y) shows 'A', etc.
// Standard opposite faces sum to 6 positions (0+5, 1+4, 2+3)
// We map: +Y=9, -Y=A, +X=10, -X=K, +Z=J, -Z=Q

const FACE_AXES: { axis: Vector3; value: CardValue }[] = [
  { axis: new Vector3(0, 1, 0), value: '9' },   // Top face (+Y)
  { axis: new Vector3(0, -1, 0), value: 'A' },  // Bottom face (-Y)
  { axis: new Vector3(1, 0, 0), value: '10' },  // Right face (+X)
  { axis: new Vector3(-1, 0, 0), value: 'K' },  // Left face (-X)
  { axis: new Vector3(0, 0, 1), value: 'J' },   // Front face (+Z)
  { axis: new Vector3(0, 0, -1), value: 'Q' },  // Back face (-Z)
];

/**
 * Determines which face of the die is pointing up based on its rotation.
 * Uses quaternion to transform the up vector and finds the closest matching face.
 */
export function getFaceValue(rotation: Quaternion): CardValue {
  const worldUp = new Vector3(0, 1, 0);

  // For each face, transform its local normal by the die's rotation
  // and check which one points most upward
  let maxDot = -Infinity;
  let faceValue: CardValue = '9';

  for (const face of FACE_AXES) {
    // Transform the face normal by the die's rotation
    const rotatedNormal = face.axis.clone().applyQuaternion(rotation);

    // Dot product with world up - higher = more upward facing
    const dot = rotatedNormal.dot(worldUp);

    if (dot > maxDot) {
      maxDot = dot;
      faceValue = face.value;
    }
  }

  return faceValue;
}

/**
 * Alternative face detection using Euler angles.
 * Less accurate but sometimes useful for debugging.
 */
export function getFaceValueFromEuler(rotation: Quaternion): CardValue {
  const euler = new Euler().setFromQuaternion(rotation, 'YZX');

  // Normalize angles to [-PI, PI]
  const normalizeAngle = (angle: number): number => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  };

  const x = normalizeAngle(euler.x);
  const z = normalizeAngle(euler.z);

  const TOLERANCE = 0.4; // ~23 degrees tolerance

  // Check which face is up based on rotation state
  const isNear = (angle: number, target: number): boolean =>
    Math.abs(angle - target) < TOLERANCE;

  const PI = Math.PI;
  const HALF_PI = Math.PI / 2;

  // Top face (+Y) - no rotation
  if (isNear(x, 0) && isNear(z, 0)) return '9';

  // Bottom face (-Y) - rotated 180 on X or Z
  if (isNear(Math.abs(x), PI) || isNear(Math.abs(z), PI)) return 'A';

  // Right face (+X) - rotated 90 on Z
  if (isNear(z, -HALF_PI)) return '10';

  // Left face (-X) - rotated -90 on Z
  if (isNear(z, HALF_PI)) return 'K';

  // Front face (+Z) - rotated 90 on X
  if (isNear(x, HALF_PI)) return 'J';

  // Back face (-Z) - rotated -90 on X
  if (isNear(x, -HALF_PI)) return 'Q';

  // Fallback: use quaternion method
  return getFaceValue(rotation);
}
