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

// Dice material presets - different visual styles
export type DiceMaterialPreset = 'casino' | 'glossy' | 'matte' | 'pearlescent';

interface MaterialProperties {
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
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
};

// Cache for loaded images (keyed by URL, unique per set)
const imageCache: Record<string, HTMLImageElement> = {};

// Create texture for a dice face from PNG
export function createDiceTexture(
  value: string,
  diceSet: DiceSetId = 'alpha',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Background color per dice set
  ctx.fillStyle = DICE_SET_BG_COLORS[diceSet];
  ctx.fillRect(0, 0, 512, 512);

  // Draw cached PNG if available
  const imageUrl = DICE_SETS[diceSet]?.[value];
  if (imageUrl && imageCache[imageUrl]) {
    ctx.drawImage(imageCache[imageUrl], 0, 0, 512, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
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

// Create materials for all six faces with specified material preset and dice set
export function createDiceMaterials(
  preset: DiceMaterialPreset = 'casino',
  diceSet: DiceSetId = 'alpha',
): THREE.Material[] {
  const materialProps = DICE_MATERIAL_PRESETS[preset];
  const useClearcoat = materialProps.clearcoat !== undefined;

  return FACE_VALUES.map((value) => {
    const texture = createDiceTexture(value, diceSet);

    // Use MeshPhysicalMaterial if clearcoat is needed, otherwise MeshStandardMaterial
    if (useClearcoat) {
      return new THREE.MeshPhysicalMaterial({
        map: texture,
        roughness: materialProps.roughness,
        metalness: materialProps.metalness,
        clearcoat: materialProps.clearcoat,
        clearcoatRoughness: materialProps.clearcoatRoughness,
      });
    } else {
      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: materialProps.roughness,
        metalness: materialProps.metalness,
      });
    }
  });
}
