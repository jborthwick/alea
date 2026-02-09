import * as THREE from 'three';
import { DICE_SIZE, DICE_EDGE_RADIUS } from '../../game/constants';

// SVG path data extracted from the reference SVG files
const SVG_PATHS = {
  // From spade-fill.svg - viewBox="0 0 256 256"
  spade: "M232,136a56,56,0,0,1-83.4,48.82l11.06,36.88A8,8,0,0,1,152,232H104a8,8,0,0,1-7.66-10.3l11.06-36.88A56,56,0,0,1,24,136c0-32,17.65-62.84,51-89.27a234.14,234.14,0,0,1,49.89-30.11,7.93,7.93,0,0,1,6.16,0A234.14,234.14,0,0,1,181,46.73C214.35,73.16,232,104,232,136Z",

  // From diamond-fill.svg - viewBox="0 0 256 256"
  diamond: "M240,128a15.85,15.85,0,0,1-4.67,11.28l-96.05,96.06a16,16,0,0,1-22.56,0h0l-96-96.06a16,16,0,0,1,0-22.56l96.05-96.06a16,16,0,0,1,22.56,0l96.05,96.06A15.85,15.85,0,0,1,240,128Z",

  // From heart-straight-fill.svg - viewBox="0 0 256 256"
  heart: "M240,98a57.63,57.63,0,0,1-17,41L133.7,229.62a8,8,0,0,1-11.4,0L33,139a58,58,0,0,1,82-82.1L128,69.05l13.09-12.19A58,58,0,0,1,240,98Z",

  // From club-fill.svg - viewBox="0 0 256 256"
  club: "M240,144a56,56,0,0,1-84.81,48h-4.44l8.91,29.7A8,8,0,0,1,152,232H104a8,8,0,0,1-7.66-10.3l8.91-29.7h-4.44A56,56,0,1,1,72,88c.78,0,1.55,0,2.33,0a56,56,0,1,1,107.34,0c.77,0,1.55,0,2.33,0A56.06,56.06,0,0,1,240,144Z"
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

// Draw letter using text rendering
function drawLetter(ctx: CanvasRenderingContext2D, letter: string, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px Arial`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(letter, x, y);
}

// Draw suit using SVG path data
function drawSuitPath(
  ctx: CanvasRenderingContext2D,
  suitName: 'spade' | 'diamond' | 'heart' | 'club',
  x: number,
  y: number,
  size: number,
  color: string
) {
  const pathData = SVG_PATHS[suitName];

  ctx.save();

  // Translate to center position
  ctx.translate(x, y);

  // Scale from 256x256 viewBox to desired size
  const scale = size / 256;
  ctx.scale(scale, scale);

  // Center the path (original viewBox is 0,0 to 256,256, so center is at 128,128)
  ctx.translate(-128, -128);

  // Draw the path
  ctx.fillStyle = color;
  const path = new Path2D(pathData);
  ctx.fill(path);

  ctx.restore();
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

// Create texture for dice faces from SVG files
export async function createDiceTextureFromSVG(
  value: string,
  isHeld: boolean = false
): Promise<THREE.CanvasTexture> {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Background - cream/ivory color for casino dice
  ctx.fillStyle = isHeld ? '#FFE4B5' : '#FFFAF0';
  ctx.fillRect(0, 0, 512, 512);

  // Load and draw SVG
  const svgFileName = SVG_FILE_MAP[value];
  if (svgFileName) {
    // Check cache first
    let img = svgImageCache[svgFileName];

    if (!img) {
      // Load SVG
      img = new Image();
      const svgModule = await import(`../../images/${svgFileName}`);
      img.src = svgModule.default;

      // Wait for image to load
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });

      svgImageCache[svgFileName] = img;
    }

    // Draw the SVG onto the canvas
    ctx.drawImage(img, 0, 0, 512, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Synchronous version that uses cached images (for re-renders)
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

  // Draw cached SVG if available
  const svgFileName = SVG_FILE_MAP[value];
  if (svgFileName && svgImageCache[svgFileName]) {
    ctx.drawImage(svgImageCache[svgFileName], 0, 0, 512, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Preload all SVG images
export async function preloadDiceSVGs(): Promise<void> {
  const loadPromises = Object.entries(SVG_FILE_MAP).map(async ([value, fileName]) => {
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
