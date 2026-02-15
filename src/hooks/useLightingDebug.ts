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
  SPOT_INTENSITY,
  SPOT_HEIGHT,
  SPOT_ANGLE,
  SPOT_PENUMBRA,
  SPOT_DECAY,
  BACK_LIGHT_INTENSITY,
  BACK_LIGHT_POS_X,
  BACK_LIGHT_POS_Y,
  BACK_LIGHT_POS_Z,
  BACK_LIGHT_DECAY,
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
  spotIntensity: SPOT_INTENSITY,
  spotHeight: SPOT_HEIGHT,
  spotAngle: SPOT_ANGLE,
  spotPenumbra: SPOT_PENUMBRA,
  spotDecay: SPOT_DECAY,
  backIntensity: BACK_LIGHT_INTENSITY,
  backPosX: BACK_LIGHT_POS_X,
  backPosY: BACK_LIGHT_POS_Y,
  backPosZ: BACK_LIGHT_POS_Z,
  backDecay: BACK_LIGHT_DECAY,
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
    'Spotlight': folder({
      spotIntensity: { value: DEFAULTS.spotIntensity, min: 0, max: 5, step: 0.1, label: d('Intensity', DEFAULTS.spotIntensity) },
      spotHeight: { value: DEFAULTS.spotHeight, min: 3, max: 25, step: 0.5, label: d('Height', DEFAULTS.spotHeight) },
      spotAngle: { value: DEFAULTS.spotAngle, min: 0.1, max: Math.PI / 2, step: 0.01, label: d('Angle', +(DEFAULTS.spotAngle.toFixed(2))) },
      spotPenumbra: { value: DEFAULTS.spotPenumbra, min: 0, max: 1, step: 0.05, label: d('Penumbra', DEFAULTS.spotPenumbra) },
      spotDecay: { value: DEFAULTS.spotDecay, min: 0, max: 3, step: 0.1, label: d('Decay', DEFAULTS.spotDecay) },
      'Reset Spot': button(() => { setRef.current?.(pick(['spotIntensity', 'spotHeight', 'spotAngle', 'spotPenumbra', 'spotDecay'])); }),
    }),
    'Backlight': folder({
      backIntensity: { value: DEFAULTS.backIntensity, min: 0, max: 5, step: 0.1, label: d('Intensity', DEFAULTS.backIntensity) },
      backPosX: { value: DEFAULTS.backPosX, min: -15, max: 15, step: 0.5, label: d('X', DEFAULTS.backPosX) },
      backPosY: { value: DEFAULTS.backPosY, min: 0, max: 15, step: 0.5, label: d('Y', DEFAULTS.backPosY) },
      backPosZ: { value: DEFAULTS.backPosZ, min: -20, max: 0, step: 0.5, label: d('Z', DEFAULTS.backPosZ) },
      backDecay: { value: DEFAULTS.backDecay, min: 0, max: 3, step: 0.1, label: d('Decay', DEFAULTS.backDecay) },
      'Reset Back': button(() => { setRef.current?.(pick(['backIntensity', 'backPosX', 'backPosY', 'backPosZ', 'backDecay'])); }),
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
// Spotlight
export const SPOT_INTENSITY = ${v['Spotlight.spotIntensity']};
export const SPOT_HEIGHT = ${v['Spotlight.spotHeight']};
export const SPOT_ANGLE = ${v['Spotlight.spotAngle']};
export const SPOT_PENUMBRA = ${v['Spotlight.spotPenumbra']};
export const SPOT_DECAY = ${v['Spotlight.spotDecay']};
// Backlight
export const BACK_LIGHT_INTENSITY = ${v['Backlight.backIntensity']};
export const BACK_LIGHT_POS_X = ${v['Backlight.backPosX']};
export const BACK_LIGHT_POS_Y = ${v['Backlight.backPosY']};
export const BACK_LIGHT_POS_Z = ${v['Backlight.backPosZ']};
export const BACK_LIGHT_DECAY = ${v['Backlight.backDecay']};
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
