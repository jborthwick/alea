import { useRef, useEffect } from 'react';
import { useControls, folder, button } from 'leva';
import {
  GRAVITY,
  DICE_MASS,
  DICE_RESTITUTION,
  DICE_FRICTION,
  ANGULAR_DAMPING,
  LINEAR_DAMPING,
  DICE_SIZE,
} from '../game/constants';

const DEFAULTS = {
  gravity: GRAVITY,
  mass: DICE_MASS,
  restitution: DICE_RESTITUTION,
  friction: DICE_FRICTION,
  angularDamping: ANGULAR_DAMPING,
  linearDamping: LINEAR_DAMPING,
  diceSize: DICE_SIZE,
};

export type PhysicsDebugValues = typeof DEFAULTS;

// Helper to create label with default value reference
const d = (name: string, val: number) => `${name} [${val}]`;

// Pick a subset of DEFAULTS by keys
function pick(keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    result[key] = DEFAULTS[key as keyof typeof DEFAULTS];
  }
  return result;
}

export function usePhysicsDebug() {
  // Use a ref to break the circular reference: button callbacks reference
  // setRef.current instead of the `set` variable from the same destructuring.
  const setRef = useRef<((values: Record<string, unknown>) => void) | null>(null);

  const [values, set] = useControls('Physics', () => ({
    'Forces': folder({
      gravity: { value: DEFAULTS.gravity, min: -120, max: -5, step: 1, label: d('Gravity', DEFAULTS.gravity) },
      mass: { value: DEFAULTS.mass, min: 0.05, max: 5, step: 0.05, label: d('Mass', DEFAULTS.mass) },
      restitution: { value: DEFAULTS.restitution, min: 0, max: 1, step: 0.05, label: d('Bounce', DEFAULTS.restitution) },
      friction: { value: DEFAULTS.friction, min: 0, max: 1, step: 0.05, label: d('Friction', DEFAULTS.friction) },
      'Reset Forces': button(() => { setRef.current?.(pick(['gravity', 'mass', 'restitution', 'friction'])); }),
    }),
    'Damping': folder({
      angularDamping: { value: DEFAULTS.angularDamping, min: 0, max: 5, step: 0.05, label: d('Angular', DEFAULTS.angularDamping) },
      linearDamping: { value: DEFAULTS.linearDamping, min: 0, max: 3, step: 0.05, label: d('Linear', DEFAULTS.linearDamping) },
      'Reset Damping': button(() => { setRef.current?.(pick(['angularDamping', 'linearDamping'])); }),
    }),
    'Appearance': folder({
      diceSize: { value: DEFAULTS.diceSize, min: 0.3, max: 2, step: 0.05, label: d('Dice Size', DEFAULTS.diceSize) },
      'Reset Appearance': button(() => { setRef.current?.(pick(['diceSize'])); }),
    }),
    'Reset All': button(() => { setRef.current?.(DEFAULTS); }),
    'Copy Values': button((get) => {
      const v = get as unknown as Record<string, number>;
      const code = `// Physics constants
export const GRAVITY = ${v['Forces.gravity']};
export const ANGULAR_DAMPING = ${v['Damping.angularDamping']};
export const LINEAR_DAMPING = ${v['Damping.linearDamping']};

// Dice appearance
export const DICE_SIZE = ${v['Appearance.diceSize']};

// Die.tsx RigidBody props
restitution={${v['Forces.restitution']}}
friction={${v['Forces.friction']}}
mass={${v['Forces.mass']}}`;

      navigator.clipboard.writeText(code).then(() => {
        console.log('Physics values copied to clipboard!\n\n' + code);
      });
    }),
  }));

  useEffect(() => {
    setRef.current = set;
  });

  return values as unknown as PhysicsDebugValues;
}
