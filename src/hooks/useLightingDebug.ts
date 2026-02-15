import { useRef, useEffect } from 'react';
import { useControls, folder, button } from 'leva';
import {
  AMBIENT_INTENSITY,
  MAIN_LIGHT_INTENSITY,
  MAIN_LIGHT_COLOR,
  MAIN_LIGHT_POS_X,
  MAIN_LIGHT_POS_Y,
  MAIN_LIGHT_POS_Z,
  FILL_LIGHT_INTENSITY,
  FILL_LIGHT_POS_X,
  FILL_LIGHT_POS_Y,
  FILL_LIGHT_POS_Z,
  OPP_LIGHT_INTENSITY,
  OPP_LIGHT_POS_X,
  OPP_LIGHT_POS_Y,
  OPP_LIGHT_POS_Z,
  OPP_LIGHT_DECAY,
  SPOT_INTENSITY,
  SPOT_HEIGHT,
  SPOT_ANGLE,
  SPOT_PENUMBRA,
  SPOT_DECAY,
  ENV_INTENSITY,
} from '../game/constants';

const DEFAULTS = {
  ambientIntensity: AMBIENT_INTENSITY,
  mainIntensity: MAIN_LIGHT_INTENSITY,
  mainColor: MAIN_LIGHT_COLOR,
  mainPosX: MAIN_LIGHT_POS_X,
  mainPosY: MAIN_LIGHT_POS_Y,
  mainPosZ: MAIN_LIGHT_POS_Z,
  fillIntensity: FILL_LIGHT_INTENSITY,
  fillPosX: FILL_LIGHT_POS_X,
  fillPosY: FILL_LIGHT_POS_Y,
  fillPosZ: FILL_LIGHT_POS_Z,
  oppLightIntensity: OPP_LIGHT_INTENSITY,
  oppLightPosX: OPP_LIGHT_POS_X,
  oppLightPosY: OPP_LIGHT_POS_Y,
  oppLightPosZ: OPP_LIGHT_POS_Z,
  oppLightDecay: OPP_LIGHT_DECAY,
  spotIntensity: SPOT_INTENSITY,
  spotHeight: SPOT_HEIGHT,
  spotAngle: SPOT_ANGLE,
  spotPenumbra: SPOT_PENUMBRA,
  spotDecay: SPOT_DECAY,
  envIntensity: ENV_INTENSITY,
};

export type LightingDebugValues = typeof DEFAULTS;

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

export function useLightingDebug() {
  const setRef = useRef<((values: Record<string, unknown>) => void) | null>(null);

  const [values, set] = useControls('Lighting', () => ({
    'Ambient': folder({
      ambientIntensity: { value: DEFAULTS.ambientIntensity, min: 0, max: 2, step: 0.05, label: d('Intensity', DEFAULTS.ambientIntensity) },
      'Reset Ambient': button(() => { setRef.current?.(pick(['ambientIntensity'])); }),
    }),
    'Main Light': folder({
      mainIntensity: { value: DEFAULTS.mainIntensity, min: 0, max: 3, step: 0.05, label: d('Intensity', DEFAULTS.mainIntensity) },
      mainColor: { value: DEFAULTS.mainColor, label: 'Color' },
      mainPosX: { value: DEFAULTS.mainPosX, min: -15, max: 15, step: 0.5, label: d('X', DEFAULTS.mainPosX) },
      mainPosY: { value: DEFAULTS.mainPosY, min: 1, max: 20, step: 0.5, label: d('Y', DEFAULTS.mainPosY) },
      mainPosZ: { value: DEFAULTS.mainPosZ, min: -15, max: 15, step: 0.5, label: d('Z', DEFAULTS.mainPosZ) },
      'Reset Main': button(() => { setRef.current?.(pick(['mainIntensity', 'mainColor', 'mainPosX', 'mainPosY', 'mainPosZ'])); }),
    }),
    'Fill Light': folder({
      fillIntensity: { value: DEFAULTS.fillIntensity, min: 0, max: 2, step: 0.05, label: d('Intensity', DEFAULTS.fillIntensity) },
      fillPosX: { value: DEFAULTS.fillPosX, min: -15, max: 15, step: 0.5, label: d('X', DEFAULTS.fillPosX) },
      fillPosY: { value: DEFAULTS.fillPosY, min: 1, max: 20, step: 0.5, label: d('Y', DEFAULTS.fillPosY) },
      fillPosZ: { value: DEFAULTS.fillPosZ, min: -15, max: 15, step: 0.5, label: d('Z', DEFAULTS.fillPosZ) },
      'Reset Fill': button(() => { setRef.current?.(pick(['fillIntensity', 'fillPosX', 'fillPosY', 'fillPosZ'])); }),
    }),
    'Opponent Light': folder({
      oppLightIntensity: { value: DEFAULTS.oppLightIntensity, min: 0, max: 20, step: 0.5, label: d('Intensity', DEFAULTS.oppLightIntensity) },
      oppLightPosX: { value: DEFAULTS.oppLightPosX, min: -15, max: 15, step: 0.5, label: d('X', DEFAULTS.oppLightPosX) },
      oppLightPosY: { value: DEFAULTS.oppLightPosY, min: 0, max: 15, step: 0.5, label: d('Y', DEFAULTS.oppLightPosY) },
      oppLightPosZ: { value: DEFAULTS.oppLightPosZ, min: -10, max: 0, step: 0.5, label: d('Z', DEFAULTS.oppLightPosZ) },
      oppLightDecay: { value: DEFAULTS.oppLightDecay, min: 0, max: 3, step: 0.1, label: d('Decay', DEFAULTS.oppLightDecay) },
      'Reset Opp': button(() => { setRef.current?.(pick(['oppLightIntensity', 'oppLightPosX', 'oppLightPosY', 'oppLightPosZ', 'oppLightDecay'])); }),
    }),
    'Spotlight': folder({
      spotIntensity: { value: DEFAULTS.spotIntensity, min: 0, max: 5, step: 0.1, label: d('Intensity', DEFAULTS.spotIntensity) },
      spotHeight: { value: DEFAULTS.spotHeight, min: 3, max: 25, step: 0.5, label: d('Height', DEFAULTS.spotHeight) },
      spotAngle: { value: DEFAULTS.spotAngle, min: 0.1, max: Math.PI / 2, step: 0.01, label: d('Angle', +(DEFAULTS.spotAngle.toFixed(2))) },
      spotPenumbra: { value: DEFAULTS.spotPenumbra, min: 0, max: 1, step: 0.05, label: d('Penumbra', DEFAULTS.spotPenumbra) },
      spotDecay: { value: DEFAULTS.spotDecay, min: 0, max: 3, step: 0.1, label: d('Decay', DEFAULTS.spotDecay) },
      'Reset Spot': button(() => { setRef.current?.(pick(['spotIntensity', 'spotHeight', 'spotAngle', 'spotPenumbra', 'spotDecay'])); }),
    }),
    'Environment': folder({
      envIntensity: { value: DEFAULTS.envIntensity, min: 0, max: 2, step: 0.05, label: d('Intensity', DEFAULTS.envIntensity) },
      'Reset Env': button(() => { setRef.current?.(pick(['envIntensity'])); }),
    }),
    'Reset All': button(() => { setRef.current?.(DEFAULTS); }),
    'Copy Values': button((get) => {
      const v = get as unknown as Record<string, number | string>;
      const code = `// Lighting constants
// Ambient
export const AMBIENT_INTENSITY = ${v['Ambient.ambientIntensity']};
// Main directional
export const MAIN_LIGHT_INTENSITY = ${v['Main Light.mainIntensity']};
export const MAIN_LIGHT_COLOR = '${v['Main Light.mainColor']}';
export const MAIN_LIGHT_POS_X = ${v['Main Light.mainPosX']};
export const MAIN_LIGHT_POS_Y = ${v['Main Light.mainPosY']};
export const MAIN_LIGHT_POS_Z = ${v['Main Light.mainPosZ']};
// Fill
export const FILL_LIGHT_INTENSITY = ${v['Fill Light.fillIntensity']};
export const FILL_LIGHT_POS_X = ${v['Fill Light.fillPosX']};
export const FILL_LIGHT_POS_Y = ${v['Fill Light.fillPosY']};
export const FILL_LIGHT_POS_Z = ${v['Fill Light.fillPosZ']};
// Opponent point light
export const OPP_LIGHT_INTENSITY = ${v['Opponent Light.oppLightIntensity']};
export const OPP_LIGHT_POS_X = ${v['Opponent Light.oppLightPosX']};
export const OPP_LIGHT_POS_Y = ${v['Opponent Light.oppLightPosY']};
export const OPP_LIGHT_POS_Z = ${v['Opponent Light.oppLightPosZ']};
export const OPP_LIGHT_DECAY = ${v['Opponent Light.oppLightDecay']};
// Spotlight
export const SPOT_INTENSITY = ${v['Spotlight.spotIntensity']};
export const SPOT_HEIGHT = ${v['Spotlight.spotHeight']};
export const SPOT_ANGLE = ${v['Spotlight.spotAngle']};
export const SPOT_PENUMBRA = ${v['Spotlight.spotPenumbra']};
export const SPOT_DECAY = ${v['Spotlight.spotDecay']};
// Environment
export const ENV_INTENSITY = ${v['Environment.envIntensity']};`;

      navigator.clipboard.writeText(code).then(() => {
        console.log('Lighting values copied to clipboard!\n\n' + code);
      });
    }),
  }));

  useEffect(() => {
    setRef.current = set;
  });

  return values as unknown as LightingDebugValues;
}
