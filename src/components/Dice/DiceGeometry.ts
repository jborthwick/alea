import * as THREE from 'three';
import { DICE_SIZE, DICE_EDGE_RADIUS, DICE_SET_BG_COLORS } from '../../game/constants';
import type { DiceSetId } from '../../game/constants';

// Import alpha dice set PNGs
import alphaA from '../../images/dice_set_alpha_A.png';
import alphaK from '../../images/dice_set_alpha_K.png';
import alphaQ from '../../images/dice_set_alpha_Q.png';
import alphaJ from '../../images/dice_set_alpha_J.png';
import alpha9 from '../../images/dice_set_alpha_9.png';
import alpha10 from '../../images/dice_set_alpha_10.png';

// Import blackmodern dice set PNGs
import blackmodernA from '../../images/dice_set_blackmodern_A.png';
import blackmodernK from '../../images/dice_set_blackmodern_K.png';
import blackmodernQ from '../../images/dice_set_blackmodern_Q.png';
import blackmodernJ from '../../images/dice_set_blackmodern_J.png';
import blackmodern9 from '../../images/dice_set_blackmodern_9.png';
import blackmodern10 from '../../images/dice_set_blackmodern_10.png';

// Import transparentwhite dice set PNGs
import twA from '../../images/dice_set_transparentwhite_A.png';
import twK from '../../images/dice_set_transparentwhite_K.png';
import twQ from '../../images/dice_set_transparentwhite_Q.png';
import twJ from '../../images/dice_set_transparentwhite_J.png';
import tw9 from '../../images/dice_set_transparentwhite_9.png';
import tw10 from '../../images/dice_set_transparentwhite_10.png';

// Dice material presets - different visual styles
export type DiceMaterialPreset = 'casino' | 'glossy' | 'matte' | 'pearlescent' | 'glass';

interface MaterialProperties {
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  ior?: number;
  thickness?: number;
  color?: string;
  envMapIntensity?: number;
  attenuationColor?: string;
  attenuationDistance?: number;
  specularIntensity?: number;
  specularColor?: string;
  emissive?: string;
  emissiveIntensity?: number;
}

export const DICE_MATERIAL_PRESETS: Record<DiceMaterialPreset, MaterialProperties> = {
  // Standard casino dice - current default
  casino: {
    roughness: 0.4,
    metalness: 0.1,
  },
  // Glossy plastic finish
  glossy: {
    roughness: 0.2,
    metalness: 0.0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
  },
  // Matte finish
  matte: {
    roughness: 0.9,
    metalness: 0.0,
  },
  // Shiny/pearlescent
  pearlescent: {
    roughness: 0.15,
    metalness: 0.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.05,
  },
  // Transparent glass — color stays white so face designs render white.
  // Glass body tint comes from attenuationColor (only affects transmitted light,
  // not the opaque design surfaces). Lower thickness = brighter colors.
  glass: {
    roughness: 0.08,
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
    emissive: '#028ed5',
    emissiveIntensity: 0.25,
  },
};

// Create a rounded box geometry for the die
export function createDiceGeometry(): THREE.BufferGeometry {
  const size = DICE_SIZE;
  const radius = DICE_EDGE_RADIUS;
  const segments = 4;

  // Use RoundedBoxGeometry approach: create box and bevel edges
  const geometry = new THREE.BoxGeometry(
    size,
    size,
    size,
    segments,
    segments,
    segments
  );

  // Apply vertex displacement for rounded corners
  const positionAttr = geometry.getAttribute('position');
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positionAttr.count; i++) {
    vertex.fromBufferAttribute(positionAttr, i);

    // Normalize to get direction, then clamp to create rounded edges
    const halfSize = size / 2;
    const innerSize = halfSize - radius;

    // For each axis, if the vertex is beyond the inner size,
    // project it onto a sphere of radius 'radius'
    const dx = Math.max(0, Math.abs(vertex.x) - innerSize);
    const dy = Math.max(0, Math.abs(vertex.y) - innerSize);
    const dz = Math.max(0, Math.abs(vertex.z) - innerSize);

    if (dx > 0 || dy > 0 || dz > 0) {
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > 0) {
        const scale = radius / len;
        vertex.x =
          Math.sign(vertex.x) * (innerSize + dx * scale);
        vertex.y =
          Math.sign(vertex.y) * (innerSize + dy * scale);
        vertex.z =
          Math.sign(vertex.z) * (innerSize + dz * scale);
      }
    }

    positionAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

// Map card values to image URLs per dice set
const DICE_SETS: Record<DiceSetId, Record<string, string>> = {
  alpha: {
    'A': alphaA, 'K': alphaK, 'Q': alphaQ,
    'J': alphaJ, '9': alpha9, '10': alpha10,
  },
  blackmodern: {
    'A': blackmodernA, 'K': blackmodernK, 'Q': blackmodernQ,
    'J': blackmodernJ, '9': blackmodern9, '10': blackmodern10,
  },
  transparentwhite: {
    'A': twA, 'K': twK, 'Q': twQ,
    'J': twJ, '9': tw9, '10': tw10,
  },
  // Rainbow reuses transparentwhite face designs — per-die glass tint is applied in Die.tsx
  rainbow: {
    'A': twA, 'K': twK, 'Q': twQ,
    'J': twJ, '9': tw9, '10': tw10,
  },
};

// Cache for loaded images (keyed by URL, unique per set)
const imageCache: Record<string, HTMLImageElement> = {};

// Generated texture resolution (normalMap, roughnessMap, transmissionMap).
// Lower than the 512px color map since these don't need pixel-perfect detail.
const GEN_MAP_SIZE = 256;

// Normal map generation constants
const NORMAL_MAP_STRENGTH = 2.0; // Sobel gradient multiplier
const NORMAL_MAP_BLUR = 2;       // Gaussian blur radius (px) for softer bevels
const NORMAL_SCALE = 0.8;        // Three.js normalScale intensity

// Generate a normal map from an image's alpha channel using Sobel edge detection
function createNormalMapFromAlpha(img: HTMLImageElement): THREE.CanvasTexture {
  const size = GEN_MAP_SIZE;

  // Draw image to extract alpha channel
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = size;
  srcCanvas.height = size;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(img, 0, 0, size, size);
  const srcData = srcCtx.getImageData(0, 0, size, size);

  // Extract alpha into a flat array
  const alpha = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    alpha[i] = srcData.data[i * 4 + 3] / 255;
  }

  // Apply Gaussian blur to alpha for softer bevel edges
  const blurred = blurAlpha(alpha, size, NORMAL_MAP_BLUR);

  // Sobel filter to compute gradients
  const outCanvas = document.createElement('canvas');
  outCanvas.width = size;
  outCanvas.height = size;
  const outCtx = outCanvas.getContext('2d')!;
  const outData = outCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Sample neighbors (clamp at edges)
      const tl = blurred[Math.max(y - 1, 0) * size + Math.max(x - 1, 0)];
      const t  = blurred[Math.max(y - 1, 0) * size + x];
      const tr = blurred[Math.max(y - 1, 0) * size + Math.min(x + 1, size - 1)];
      const l  = blurred[y * size + Math.max(x - 1, 0)];
      const r  = blurred[y * size + Math.min(x + 1, size - 1)];
      const bl = blurred[Math.min(y + 1, size - 1) * size + Math.max(x - 1, 0)];
      const b  = blurred[Math.min(y + 1, size - 1) * size + x];
      const br = blurred[Math.min(y + 1, size - 1) * size + Math.min(x + 1, size - 1)];

      // Sobel kernels
      const dX = (tr + 2 * r + br - tl - 2 * l - bl) * NORMAL_MAP_STRENGTH;
      const dY = (bl + 2 * b + br - tl - 2 * t - tr) * NORMAL_MAP_STRENGTH;

      // Encode as tangent-space normal (R=X, G=Y, B=Z)
      const idx = (y * size + x) * 4;
      outData.data[idx]     = Math.min(255, Math.max(0, (dX * 0.5 + 0.5) * 255));
      outData.data[idx + 1] = Math.min(255, Math.max(0, (-dY * 0.5 + 0.5) * 255)); // flip Y for GL convention
      outData.data[idx + 2] = 255; // Z points out
      outData.data[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outData, 0, 0);
  const texture = new THREE.CanvasTexture(outCanvas);
  texture.needsUpdate = true;
  return texture;
}

// Simple box blur on a float array (separable, applied twice for approximate Gaussian)
function blurAlpha(src: Float32Array, size: number, radius: number): Float32Array {
  if (radius <= 0) return src;
  let current = src;
  // Two passes of box blur approximates Gaussian
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(size * size);
    // Horizontal pass
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        let count = 0;
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = Math.min(size - 1, Math.max(0, x + dx));
          sum += current[y * size + sx];
          count++;
        }
        tmp[y * size + x] = sum / count;
      }
    }
    const out = new Float32Array(size * size);
    // Vertical pass
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const sy = Math.min(size - 1, Math.max(0, y + dy));
          sum += tmp[sy * size + x];
          count++;
        }
        out[y * size + x] = sum / count;
      }
    }
    current = out;
  }
  return current;
}

interface DiceTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture | null;
  roughnessMap: THREE.CanvasTexture | null;
  transmissionMap: THREE.CanvasTexture | null;
}

// Create a grayscale texture from an image's alpha channel.
// Maps alpha > threshold to `designVal`, alpha <= threshold to `bgVal`.
function createAlphaMapTexture(img: HTMLImageElement, designVal: number, bgVal: number): THREE.CanvasTexture {
  const size = GEN_MAP_SIZE;
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = size;
  srcCanvas.height = size;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(img, 0, 0, size, size);
  const srcData = srcCtx.getImageData(0, 0, size, size);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = size;
  outCanvas.height = size;
  const outCtx = outCanvas.getContext('2d')!;
  const outData = outCtx.createImageData(size, size);

  for (let i = 0; i < size * size; i++) {
    const val = srcData.data[i * 4 + 3] > 10 ? designVal : bgVal;
    outData.data[i * 4]     = val;
    outData.data[i * 4 + 1] = val;
    outData.data[i * 4 + 2] = val;
    outData.data[i * 4 + 3] = 255;
  }

  outCtx.putImageData(outData, 0, 0);
  const texture = new THREE.CanvasTexture(outCanvas);
  texture.needsUpdate = true;
  return texture;
}

// Create textures for a dice face.
// Glass: plain white color map — design visibility comes from the transmissionMap
// (reduces transmission on design areas) and roughnessMap (frosted etch). The material's
// own `color` property controls the glass body tint (like the Three.js dragon example).
// Non-glass: solid dice set background color with designs drawn on top.
export function createDiceTexture(
  value: string,
  diceSet: DiceSetId = 'alpha',
  isGlass = false,
): DiceTextures {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Draw cached PNG if available
  const imageUrl = DICE_SETS[diceSet]?.[value];
  const img = imageUrl ? imageCache[imageUrl] : null;

  if (isGlass) {
    // Plain white — the material `color` property tints the glass body,
    // and transmissionMap/roughnessMap make designs visible through reduced
    // transmission and frosted etching.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);
  } else {
    // Non-glass: solid background with design drawn on top
    ctx.fillStyle = DICE_SET_BG_COLORS[diceSet];
    ctx.fillRect(0, 0, 512, 512);
    if (img) {
      ctx.drawImage(img, 0, 0, 512, 512);
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.needsUpdate = true;

  // Generate normal map from the PNG's alpha channel (works for both glass and non-glass)
  const normalMap = img ? createNormalMapFromAlpha(img) : null;

  // Glass: roughnessMap (frosted etch on designs) + transmissionMap (reduced transmission on designs)
  // roughnessMap: design=100 (frosted), bg=0 (smooth). transmissionMap: design=128 (half), bg=255 (full).
  const roughnessMap = (img && isGlass) ? createAlphaMapTexture(img, 100, 0) : null;
  const transmissionMap = (img && isGlass) ? createAlphaMapTexture(img, 128, 255) : null;

  return { map, normalMap, roughnessMap, transmissionMap };
}

// Preload all dice set PNG images - must be called before rendering
export async function preloadAllDiceSets(): Promise<void> {
  const allImages: string[] = [];
  for (const setImages of Object.values(DICE_SETS)) {
    allImages.push(...Object.values(setImages));
  }

  const loadPromises = allImages.map(async (imageUrl) => {
    if (imageCache[imageUrl]) return; // Already loaded
    const img = new Image();
    img.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        imageCache[imageUrl] = img;
        resolve();
      };
      img.onerror = reject;
    });
  });

  await Promise.all(loadPromises);
}

// Face values in order: +X, -X, +Y, -Y, +Z, -Z
// Mapped to: 10, K, 9, A, J, Q
export const FACE_VALUES = ['10', 'K', '9', 'A', 'J', 'Q'];

// Dispose an array of materials and all their textures to free GPU memory.
// Call this in useEffect cleanup whenever materials are recreated.
function disposeMaterials(materials: THREE.Material[]): void {
  for (const mat of materials) {
    // Dispose all texture properties
    const m = mat as unknown as Record<string, unknown>;
    for (const key of ['map', 'normalMap', 'roughnessMap', 'transmissionMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
      const tex = m[key];
      if (tex instanceof THREE.Texture) {
        tex.dispose();
      }
    }
    mat.dispose();
  }
}

// Glass debug overrides — controls exposed in the Leva debug panel.
// Note: roughness is not here because it's controlled by the roughnessMap (frosted etch).
export interface GlassOverrides {
  metalness: number;
  transmission: number;
  ior: number;
  thickness: number;
  color: string;
  envMapIntensity: number;
  attenuationColor: string;
  attenuationDistance: number;
  specularIntensity: number;
  specularColor: string;
  emissive: string;
  emissiveIntensity: number;
}

// Material cache: all dice sharing the same (preset, diceSet) reuse the same material array.
// This prevents 11 dice from each creating their own materials/textures.
// Glass overrides are applied in-place so the textures aren't recreated.
const materialCache = new Map<string, { materials: THREE.Material[]; refCount: number }>();

function buildCacheKey(preset: DiceMaterialPreset, diceSet: DiceSetId): string {
  return `${preset}:${diceSet}`;
}

// Create (or reuse cached) materials for all six faces.
// All dice with the same preset + diceSet share materials. Call releaseDiceMaterials when done.
export function createDiceMaterials(
  preset: DiceMaterialPreset = 'casino',
  diceSet: DiceSetId = 'alpha',
  glassOverrides?: GlassOverrides,
): THREE.Material[] {
  const key = buildCacheKey(preset, diceSet);
  let entry = materialCache.get(key);

  if (!entry) {
    // Create new materials
    const materials = buildMaterials(preset, diceSet);
    entry = { materials, refCount: 0 };
    materialCache.set(key, entry);
  }

  entry.refCount++;

  // Apply glass debug overrides in-place (updates material properties without recreating)
  if (preset === 'glass' && glassOverrides) {
    applyGlassOverrides(entry.materials, glassOverrides);
  }

  return entry.materials;
}

// Release a reference to cached materials. Disposes when no more references exist.
export function releaseDiceMaterials(preset: DiceMaterialPreset, diceSet: DiceSetId): void {
  const key = buildCacheKey(preset, diceSet);
  const entry = materialCache.get(key);
  if (!entry) return;

  entry.refCount--;
  if (entry.refCount <= 0) {
    disposeMaterials(entry.materials);
    materialCache.delete(key);
  }
}

// Apply glass debug overrides to existing materials in-place (no texture recreation needed).
export function applyGlassOverrides(materials: THREE.Material[], overrides: GlassOverrides): void {
  for (const mat of materials) {
    if (mat instanceof THREE.MeshPhysicalMaterial) {
      mat.metalness = overrides.metalness;
      mat.transmission = overrides.transmission;
      mat.ior = overrides.ior;
      mat.thickness = overrides.thickness;
      mat.color.set(overrides.color);
      mat.envMapIntensity = overrides.envMapIntensity;
      mat.attenuationColor.set(overrides.attenuationColor);
      mat.attenuationDistance = overrides.attenuationDistance;
      mat.specularIntensity = overrides.specularIntensity;
      mat.specularColor.set(overrides.specularColor);
      mat.emissive.set(overrides.emissive);
      mat.emissiveIntensity = overrides.emissiveIntensity;
      mat.needsUpdate = true;
    }
  }
}

// Build fresh material array (internal, used by cache)
function buildMaterials(preset: DiceMaterialPreset, diceSet: DiceSetId): THREE.Material[] {
  const materialProps = DICE_MATERIAL_PRESETS[preset];
  const usePhysical = materialProps.clearcoat !== undefined || materialProps.transmission !== undefined;
  const isGlass = preset === 'glass';

  return FACE_VALUES.map((value) => {
    const { map, normalMap, roughnessMap, transmissionMap } = createDiceTexture(value, diceSet, isGlass);
    const normalProps = normalMap ? {
      normalMap,
      normalScale: new THREE.Vector2(NORMAL_SCALE, NORMAL_SCALE),
    } : {};

    // Use MeshPhysicalMaterial for clearcoat or transmission, otherwise MeshStandardMaterial
    if (usePhysical) {
      return new THREE.MeshPhysicalMaterial({
        map,
        roughness: materialProps.roughness,
        metalness: materialProps.metalness,
        clearcoat: materialProps.clearcoat ?? 0,
        clearcoatRoughness: materialProps.clearcoatRoughness ?? 0,
        ...(materialProps.transmission !== undefined && {
          transmission: materialProps.transmission,
          ior: materialProps.ior ?? 1.5,
          thickness: materialProps.thickness ?? 0.01,
        }),
        // Glass: roughnessMap for frosted etch, transmissionMap for partial design visibility.
        // roughnessMap overrides base roughness to 1 so the map has full control.
        ...(roughnessMap && { roughnessMap, roughness: 1 }),
        ...(transmissionMap && { transmissionMap }),
        ...(materialProps.color && { color: materialProps.color }),
        ...(materialProps.envMapIntensity !== undefined && { envMapIntensity: materialProps.envMapIntensity }),
        ...(materialProps.attenuationColor && { attenuationColor: new THREE.Color(materialProps.attenuationColor) }),
        ...(materialProps.attenuationDistance !== undefined && { attenuationDistance: materialProps.attenuationDistance }),
        ...(materialProps.specularIntensity !== undefined && { specularIntensity: materialProps.specularIntensity }),
        ...(materialProps.specularColor && { specularColor: new THREE.Color(materialProps.specularColor) }),
        ...(materialProps.emissive && { emissive: new THREE.Color(materialProps.emissive) }),
        ...(materialProps.emissiveIntensity !== undefined && { emissiveIntensity: materialProps.emissiveIntensity }),
        ...normalProps,
      });
    } else {
      return new THREE.MeshStandardMaterial({
        map,
        roughness: materialProps.roughness,
        metalness: materialProps.metalness,
        ...normalProps,
      });
    }
  });
}
