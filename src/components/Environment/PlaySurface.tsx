import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useMemo } from 'react';
import { TABLE_WIDTH, TABLE_DEPTH, CEILING_HEIGHT, PLAY_AREA_DEPTH } from '../../game/constants';

// Create felt texture programmatically
function createFeltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base green felt color
  ctx.fillStyle = '#1a8c1a';
  ctx.fillRect(0, 0, 256, 256);

  // Add felt texture with directional fibers - optimized
  const imageData = ctx.getImageData(0, 0, 256, 256);
  const data = imageData.data;

  // Pre-calculate random values for better performance
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % 256;
    const y = Math.floor((i / 4) / 256);

    // Random noise
    const noise = (Math.random() - 0.5) * 40;

    // Directional fiber pattern (subtle diagonal lines) - tighter/smaller fibers
    const fiber = Math.sin(x * 0.4 + y * 0.2) * 8;

    const variation = noise + fiber;

    data[i] = Math.max(0, Math.min(255, data[i] + variation));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + variation));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + variation));
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Create a rounded rectangle shape for the felt surface
function createRoundedRectShape(width: number, depth: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(radius, hw, hd);

  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

  return shape;
}

export function PlaySurface() {
  const feltTexture = useMemo(() => createFeltTexture(), []);

  const halfWidth = TABLE_WIDTH / 2;
  const halfDepth = TABLE_DEPTH / 2;
  const wallThickness = 0.3;
  const wallHalfThickness = wallThickness / 2;

  const cornerRadius = 0.5;
  const roundedShape = useMemo(() => createRoundedRectShape(TABLE_WIDTH, TABLE_DEPTH, cornerRadius), []);
  const extrudeSettings = useMemo(() => ({
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 3,
  }), []);

  return (
    <group>
      {/* Main felt surface with rounded corners */}
      <RigidBody type="fixed" position={[0, -0.2, 0]}>
        <CuboidCollider args={[halfWidth, 0.2, halfDepth]} />
        <mesh receiveShadow position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <extrudeGeometry args={[roundedShape, extrudeSettings]} />
          <meshStandardMaterial
            map={feltTexture}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      </RigidBody>

      {/* Invisible tall wall colliders to contain dice */}
      {/* Back wall collider */}
      <RigidBody type="fixed" position={[0, CEILING_HEIGHT / 2, -halfDepth - wallHalfThickness]}>
        <CuboidCollider args={[halfWidth + wallThickness, CEILING_HEIGHT / 2, wallHalfThickness]} />
      </RigidBody>

      {/* Front wall collider (at table edge) */}
      <RigidBody type="fixed" position={[0, CEILING_HEIGHT / 2, halfDepth + wallHalfThickness]}>
        <CuboidCollider args={[halfWidth + wallThickness, CEILING_HEIGHT / 2, wallHalfThickness]} />
      </RigidBody>

      {/* Inner front barrier - keeps dice in playable area above the UI */}
      {/* This creates a safe zone at the bottom of the screen */}
      <RigidBody type="fixed" position={[0, CEILING_HEIGHT / 2, PLAY_AREA_DEPTH / 2]}>
        <CuboidCollider args={[halfWidth, CEILING_HEIGHT / 2, wallHalfThickness]} />
      </RigidBody>

      {/* Left wall collider */}
      <RigidBody type="fixed" position={[-halfWidth - wallHalfThickness, CEILING_HEIGHT / 2, 0]}>
        <CuboidCollider args={[wallHalfThickness, CEILING_HEIGHT / 2, halfDepth]} />
      </RigidBody>

      {/* Right wall collider */}
      <RigidBody type="fixed" position={[halfWidth + wallHalfThickness, CEILING_HEIGHT / 2, 0]}>
        <CuboidCollider args={[wallHalfThickness, CEILING_HEIGHT / 2, halfDepth]} />
      </RigidBody>

      {/* Invisible ceiling collider */}
      <RigidBody type="fixed" position={[0, CEILING_HEIGHT, 0]}>
        <CuboidCollider args={[halfWidth + wallThickness, 0.1, halfDepth + wallThickness]} />
      </RigidBody>
    </group>
  );
}
