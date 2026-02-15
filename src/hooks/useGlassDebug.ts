import { useRef, useEffect } from 'react';
import { useControls, folder, button } from 'leva';

const DEFAULTS = {
  roughness: 0.05,
  metalness: 0.0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
  transmission: 0.7,
  ior: 1.45,
  thickness: 0.7,
  color: '#ffffff',
  envMapIntensity: 2.5,
};

export type GlassDebugValues = typeof DEFAULTS;

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

export function useGlassDebug() {
  const setRef = useRef<((values: Record<string, unknown>) => void) | null>(null);

  const [values, set] = useControls('Glass Material', () => ({
    'Surface': folder({
      roughness: { value: DEFAULTS.roughness, min: 0, max: 1, step: 0.01, label: d('Roughness', DEFAULTS.roughness) },
      metalness: { value: DEFAULTS.metalness, min: 0, max: 1, step: 0.01, label: d('Metalness', DEFAULTS.metalness) },
      clearcoat: { value: DEFAULTS.clearcoat, min: 0, max: 1, step: 0.01, label: d('Clearcoat', DEFAULTS.clearcoat) },
      clearcoatRoughness: { value: DEFAULTS.clearcoatRoughness, min: 0, max: 1, step: 0.01, label: d('CC Rough', DEFAULTS.clearcoatRoughness) },
      'Reset Surface': button(() => { setRef.current?.(pick(['roughness', 'metalness', 'clearcoat', 'clearcoatRoughness'])); }),
    }),
    'Transparency': folder({
      transmission: { value: DEFAULTS.transmission, min: 0, max: 1, step: 0.01, label: d('Transmission', DEFAULTS.transmission) },
      ior: { value: DEFAULTS.ior, min: 1.0, max: 2.5, step: 0.01, label: d('IOR', DEFAULTS.ior) },
      thickness: { value: DEFAULTS.thickness, min: 0, max: 2, step: 0.05, label: d('Thickness', DEFAULTS.thickness) },
      'Reset Transparency': button(() => { setRef.current?.(pick(['transmission', 'ior', 'thickness'])); }),
    }),
    'Appearance': folder({
      color: { value: DEFAULTS.color, label: 'Color' },
      envMapIntensity: { value: DEFAULTS.envMapIntensity, min: 0, max: 5, step: 0.1, label: d('Env Map', DEFAULTS.envMapIntensity) },
      'Reset Appearance': button(() => { setRef.current?.(pick(['color', 'envMapIntensity'])); }),
    }),
    'Reset All': button(() => { setRef.current?.(DEFAULTS); }),
    'Copy Values': button((get) => {
      const v = get as unknown as Record<string, number | string>;
      const code = `// Glass material preset
glass: {
  roughness: ${v['Surface.roughness']},
  metalness: ${v['Surface.metalness']},
  clearcoat: ${v['Surface.clearcoat']},
  clearcoatRoughness: ${v['Surface.clearcoatRoughness']},
  transmission: ${v['Transparency.transmission']},
  ior: ${v['Transparency.ior']},
  thickness: ${v['Transparency.thickness']},
  transparent: true,
  color: '${v['Appearance.color']}',
  envMapIntensity: ${v['Appearance.envMapIntensity']},
},`;

      navigator.clipboard.writeText(code).then(() => {
        console.log('Glass values copied to clipboard!\n\n' + code);
      });
    }),
  }));

  useEffect(() => {
    setRef.current = set;
  });

  return values as unknown as GlassDebugValues;
}
