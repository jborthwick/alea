import { useRef, useEffect } from 'react';
import { useControls, folder, button } from 'leva';

const DEFAULTS = {
  metalness: 0.05,
  transmission: 1,
  ior: 1.5,
  thickness: 1.2,
  color: '#ffffff',
  envMapIntensity: 1.5,
  attenuationColor: '#53d5fd',
  attenuationDistance: 2.0,
  specularIntensity: 1,
  specularColor: '#ffffff',
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
    'Transmission': folder({
      transmission: { value: DEFAULTS.transmission, min: 0, max: 1, step: 0.01, label: d('Transmission', DEFAULTS.transmission) },
      ior: { value: DEFAULTS.ior, min: 1.0, max: 2.5, step: 0.01, label: d('IOR', DEFAULTS.ior) },
      thickness: { value: DEFAULTS.thickness, min: 0, max: 5, step: 0.01, label: d('Thickness', DEFAULTS.thickness) },
      attenuationColor: { value: DEFAULTS.attenuationColor, label: 'Atten Color' },
      attenuationDistance: { value: DEFAULTS.attenuationDistance, min: 0, max: 5, step: 0.01, label: d('Atten Dist', DEFAULTS.attenuationDistance) },
      'Reset Transmission': button(() => { setRef.current?.(pick(['transmission', 'ior', 'thickness', 'attenuationColor', 'attenuationDistance'])); }),
    }),
    'Specular': folder({
      specularIntensity: { value: DEFAULTS.specularIntensity, min: 0, max: 1, step: 0.01, label: d('Intensity', DEFAULTS.specularIntensity) },
      specularColor: { value: DEFAULTS.specularColor, label: 'Color' },
      'Reset Specular': button(() => { setRef.current?.(pick(['specularIntensity', 'specularColor'])); }),
    }),
    'Appearance': folder({
      metalness: { value: DEFAULTS.metalness, min: 0, max: 1, step: 0.01, label: d('Metalness', DEFAULTS.metalness) },
      color: { value: DEFAULTS.color, label: 'Color' },
      envMapIntensity: { value: DEFAULTS.envMapIntensity, min: 0, max: 5, step: 0.1, label: d('Env Map', DEFAULTS.envMapIntensity) },
      'Reset Appearance': button(() => { setRef.current?.(pick(['metalness', 'color', 'envMapIntensity'])); }),
    }),
    'Reset All': button(() => { setRef.current?.(DEFAULTS); }),
    'Copy Values': button((get) => {
      const v = get as unknown as Record<string, number | string>;
      const code = `// Glass material preset
glass: {
  metalness: ${v['Appearance.metalness']},
  transmission: ${v['Transmission.transmission']},
  ior: ${v['Transmission.ior']},
  thickness: ${v['Transmission.thickness']},
  color: '${v['Appearance.color']}',
  envMapIntensity: ${v['Appearance.envMapIntensity']},
  attenuationColor: '${v['Transmission.attenuationColor']}',
  attenuationDistance: ${v['Transmission.attenuationDistance']},
  specularIntensity: ${v['Specular.specularIntensity']},
  specularColor: '${v['Specular.specularColor']}',
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
