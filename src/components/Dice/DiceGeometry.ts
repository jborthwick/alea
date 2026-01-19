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

// Create texture for dice faces with card values
export function createDiceTexture(
  value: string,
  isHeld: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Background - cream/ivory color for casino dice
  ctx.fillStyle = isHeld ? '#FFE4B5' : '#FFFAF0'; // Moccasin when held, FloralWhite otherwise
  ctx.fillRect(0, 0, 256, 256);

  // Add subtle border/edge effect
  ctx.strokeStyle = '#DEB887';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 236, 236);

  // Draw the value
  ctx.fillStyle = '#8B0000'; // Dark red for card values
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Adjust font size based on value length
  const fontSize = value.length > 1 ? 100 : 120;
  ctx.font = `bold ${fontSize}px "Georgia", serif`;

  ctx.fillText(value, 128, 128);

  // Add small corner indicators for J, Q, K, A
  if (['J', 'Q', 'K', 'A'].includes(value)) {
    ctx.font = 'bold 32px "Georgia", serif';
    ctx.fillText(value, 40, 40);
    ctx.save();
    ctx.translate(216, 216);
    ctx.rotate(Math.PI);
    ctx.fillText(value, 0, 0);
    ctx.restore();
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
