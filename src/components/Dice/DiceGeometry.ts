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

// Draw a pip (dot) for dice
function drawPip(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}

// Draw pips for number cards
function drawPips(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, count: number, color: string) {
  const pipSize = 18;  // Larger pip size
  const spacing = 60;  // More spacing between pips

  if (count === 9) {
    // 9 pips in 3x3 grid
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = centerX + (col - 1) * spacing;
        const y = centerY + (row - 1) * spacing;
        drawPip(ctx, x, y, pipSize, color);
      }
    }
  } else if (count === 10) {
    // 10 pips: 4 corners + 4 edges + 2 center
    // Four corners
    drawPip(ctx, centerX - spacing, centerY - spacing, pipSize, color);
    drawPip(ctx, centerX + spacing, centerY - spacing, pipSize, color);
    drawPip(ctx, centerX - spacing, centerY + spacing, pipSize, color);
    drawPip(ctx, centerX + spacing, centerY + spacing, pipSize, color);

    // Four edges (middle of each side)
    drawPip(ctx, centerX, centerY - spacing, pipSize, color);
    drawPip(ctx, centerX, centerY + spacing, pipSize, color);
    drawPip(ctx, centerX - spacing, centerY, pipSize, color);
    drawPip(ctx, centerX + spacing, centerY, pipSize, color);

    // Two center pips (vertically aligned)
    drawPip(ctx, centerX - spacing / 2, centerY, pipSize, color);
    drawPip(ctx, centerX + spacing / 2, centerY, pipSize, color);
  }
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

// Create texture for dice faces with card values
export function createDiceTexture(
  value: string,
  isHeld: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Background - cream/ivory color for casino dice
  ctx.fillStyle = isHeld ? '#FFE4B5' : '#FFFAF0'; // Moccasin when held, FloralWhite otherwise
  ctx.fillRect(0, 0, 512, 512);

  // The rounded box geometry only shows the center ~60% of the texture
  // So we need to draw everything in a smaller "safe zone" in the center
  const centerX = 256;
  const centerY = 256;
  const safeZone = 150; // Radius of visible area

  // Add subtle border/edge effect (in safe zone)
  ctx.strokeStyle = '#DEB887';
  ctx.lineWidth = 4;
  ctx.strokeRect(centerX - safeZone, centerY - safeZone, safeZone * 2, safeZone * 2);

  // Face cards with suits
  if (value === 'A') {
    // Ace - Spade (black)

    // Top left corner letter (in safe zone) - 120px
    drawLetter(ctx, 'A', centerX - safeZone + 12, centerY - safeZone + 12, 120, '#000000');

    // Bottom right corner (rotated, in safe zone)
    ctx.save();
    ctx.translate(centerX + safeZone - 12, centerY + safeZone - 12);
    ctx.rotate(Math.PI);
    drawLetter(ctx, 'A', 0, 0, 120, '#000000');
    ctx.restore();

    // Draw spade suit in center (larger)
    drawSuitPath(ctx, 'spade', centerX, centerY, 90, '#000000');
  } else if (value === 'K') {
    // King - Diamond (blue)

    drawLetter(ctx, 'K', centerX - safeZone + 12, centerY - safeZone + 12, 120, '#0066CC');

    ctx.save();
    ctx.translate(centerX + safeZone - 12, centerY + safeZone - 12);
    ctx.rotate(Math.PI);
    drawLetter(ctx, 'K', 0, 0, 120, '#0066CC');
    ctx.restore();

    drawSuitPath(ctx, 'diamond', centerX, centerY, 90, '#0066CC');
  } else if (value === 'Q') {
    // Queen - Heart (red)

    drawLetter(ctx, 'Q', centerX - safeZone + 12, centerY - safeZone + 12, 120, '#CC0000');

    ctx.save();
    ctx.translate(centerX + safeZone - 12, centerY + safeZone - 12);
    ctx.rotate(Math.PI);
    drawLetter(ctx, 'Q', 0, 0, 120, '#CC0000');
    ctx.restore();

    drawSuitPath(ctx, 'heart', centerX, centerY, 90, '#CC0000');
  } else if (value === 'J') {
    // Jack - Club (green)

    drawLetter(ctx, 'J', centerX - safeZone + 12, centerY - safeZone + 12, 120, '#009900');

    ctx.save();
    ctx.translate(centerX + safeZone - 12, centerY + safeZone - 12);
    ctx.rotate(Math.PI);
    drawLetter(ctx, 'J', 0, 0, 120, '#009900');
    ctx.restore();

    drawSuitPath(ctx, 'club', centerX, centerY, 90, '#009900');
  } else {
    // Number cards (9, 10) - draw as text (larger than before)
    ctx.fillStyle = '#8B0000'; // Dark red for card values
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Larger font size for better visibility
    const fontSize = value.length > 1 ? 180 : 200;
    ctx.font = `bold ${fontSize}px Georgia, serif`;

    ctx.fillText(value, centerX, centerY);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
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
