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
  transparent?: boolean;
  opacity?: number;
  color?: string;
  envMapIntensity?: number;
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
  // Transparent glass/acrylic
  glass: {
    roughness: 0.05,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    transmission: 1.0,
    ior: 1.45,
    thickness: 0.5,
    transparent: true,
    color: '#ffffff',
    envMapIntensity: 2.5,
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
};

// Cache for loaded images (keyed by URL, unique per set)
const imageCache: Record<string, HTMLImageElement> = {};

// Normal map generation constants
const NORMAL_MAP_STRENGTH = 2.0; // Sobel gradient multiplier
const NORMAL_MAP_BLUR = 2;       // Gaussian blur radius (px) for softer bevels
const NORMAL_SCALE = 0.8;        // Three.js normalScale intensity

// Generate a normal map from an image's alpha channel using Sobel edge detection
function createNormalMapFromAlpha(img: HTMLImageElement): THREE.CanvasTexture {
  const size = 512;

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
  transmissionMap: THREE.CanvasTexture | null;
}

// Generate a transmission map from alpha: white where transparent (glass), black where opaque (design)
function createTransmissionMapFromAlpha(img: HTMLImageElement): THREE.CanvasTexture {
  const size = 512;
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
    const alpha = srcData.data[i * 4 + 3]; // 0 = transparent, 255 = opaque
    // Binary threshold: any pixel with alpha > 10 is fully opaque (black = block transmission)
    // This prevents semi-transparent PNG pixels from creating partial transmission
    const val = alpha > 10 ? 0 : 255;
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

// Create textures for a dice face: color map + normal map from alpha + optional transmission map
export function createDiceTexture(
  value: string,
  diceSet: DiceSetId = 'alpha',
  needsTransmissionMap = false,
): DiceTextures {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Background color per dice set
  ctx.fillStyle = DICE_SET_BG_COLORS[diceSet];
  ctx.fillRect(0, 0, 512, 512);

  // Draw cached PNG if available
  const imageUrl = DICE_SETS[diceSet]?.[value];
  const img = imageUrl ? imageCache[imageUrl] : null;
  if (img) {
    ctx.drawImage(img, 0, 0, 512, 512);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.needsUpdate = true;

  // Generate normal map from the PNG's alpha channel
  const normalMap = img ? createNormalMapFromAlpha(img) : null;

  // Generate transmission map for glass materials (white=transmit, black=opaque design)
  const transmissionMap = (img && needsTransmissionMap) ? createTransmissionMapFromAlpha(img) : null;

  return { map, normalMap, transmissionMap };
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

// Optional glass debug overrides
export interface GlassOverrides {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  transmission: number;
  ior: number;
  thickness: number;
  color: string;
  envMapIntensity: number;
}

// Create materials for all six faces with specified material preset and dice set
export function createDiceMaterials(
  preset: DiceMaterialPreset = 'casino',
  diceSet: DiceSetId = 'alpha',
  glassOverrides?: GlassOverrides,
): THREE.Material[] {
  let materialProps = DICE_MATERIAL_PRESETS[preset];

  // Apply glass debug overrides when preset is glass
  if (preset === 'glass' && glassOverrides) {
    materialProps = {
      ...materialProps,
      roughness: glassOverrides.roughness,
      metalness: glassOverrides.metalness,
      clearcoat: glassOverrides.clearcoat,
      clearcoatRoughness: glassOverrides.clearcoatRoughness,
      transmission: glassOverrides.transmission,
      ior: glassOverrides.ior,
      thickness: glassOverrides.thickness,
      color: glassOverrides.color,
      envMapIntensity: glassOverrides.envMapIntensity,
    };
  }

  const usePhysical = materialProps.clearcoat !== undefined || materialProps.transmission !== undefined;
  const needsTransmissionMap = materialProps.transmission !== undefined;

  return FACE_VALUES.map((value) => {
    const { map, normalMap, transmissionMap } = createDiceTexture(value, diceSet, needsTransmissionMap);
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
          thickness: materialProps.thickness ?? 0.5,
          ...(transmissionMap && { transmissionMap }),
        }),
        ...(materialProps.transparent && { transparent: true }),
        ...(materialProps.opacity !== undefined && { opacity: materialProps.opacity }),
        ...(materialProps.color && { color: materialProps.color }),
        ...(materialProps.envMapIntensity !== undefined && { envMapIntensity: materialProps.envMapIntensity }),
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
