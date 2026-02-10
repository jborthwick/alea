import * as THREE from 'three';
import { DICE_SIZE, DICE_EDGE_RADIUS } from '../../game/constants';

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

// Map card values to image filenames
const SVG_FILE_MAP: Record<string, string> = {
  'A': 'dice_set_alpha_A.png',
  'K': 'dice_set_alpha_K.png',
  'Q': 'dice_set_alpha_Q.png',
  'J': 'dice_set_alpha_J.png',
  '9': 'dice_set_alpha_9.png',
  '10': 'dice_set_alpha_10.png',
};

// Cache for loaded SVG images
const svgImageCache: Record<string, HTMLImageElement> = {};

// Create texture for dice faces from PNG files
export function createDiceTexture(
  value: string,
  isHeld: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Background - cream/ivory color for casino dice
  ctx.fillStyle = isHeld ? '#FFE4B5' : '#FFFAF0';
  ctx.fillRect(0, 0, 512, 512);

  // Draw cached PNG if available
  const svgFileName = SVG_FILE_MAP[value];
  if (svgFileName && svgImageCache[svgFileName]) {
    ctx.drawImage(svgImageCache[svgFileName], 0, 0, 512, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Preload all PNG images - must be called before rendering
export async function preloadDicePNGs(): Promise<void> {
  const loadPromises = Object.entries(SVG_FILE_MAP).map(async ([_, fileName]) => {
    const img = new Image();
    const svgModule = await import(`../../images/${fileName}`);
    img.src = svgModule.default;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        svgImageCache[fileName] = img;
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

// Create materials for all six faces
export function createDiceMaterials(isHeld: boolean = false): THREE.MeshStandardMaterial[] {
  return FACE_VALUES.map((value) => {
    const texture = createDiceTexture(value, isHeld);
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.4,
      metalness: 0.1,
    });
  });
}
