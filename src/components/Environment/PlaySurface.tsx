import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useMemo } from 'react';
import { TABLE_WIDTH, TABLE_DEPTH, WALL_HEIGHT, CEILING_HEIGHT } from '../../game/constants';

// Create felt texture programmatically
function createFeltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base green felt color
  ctx.fillStyle = '#0d5c0d';
  ctx.fillRect(0, 0, 512, 512);

  // Add subtle noise for felt texture
  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 15;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Create wood texture for rails
function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base wood color
  ctx.fillStyle = '#5D3A1A';
  ctx.fillRect(0, 0, 256, 256);

  // Add wood grain lines
  ctx.strokeStyle = '#4A2E14';
  ctx.lineWidth = 2;

  for (let i = 0; i < 256; i += 8 + Math.random() * 8) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    let x = 0;
    while (x < 256) {
      x += 10 + Math.random() * 20;
      const y = i + (Math.random() - 0.5) * 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function PlaySurface() {
  const feltTexture = useMemo(() => createFeltTexture(), []);
  const woodTexture = useMemo(() => createWoodTexture(), []);

  const halfWidth = TABLE_WIDTH / 2;
  const halfDepth = TABLE_DEPTH / 2;
  const wallThickness = 0.3;
  const wallHalfThickness = wallThickness / 2;

  return (
    <group>
      {/* Main felt surface */}
      <RigidBody type="fixed" position={[0, -0.1, 0]}>
        <CuboidCollider args={[halfWidth, 0.1, halfDepth]} />
        <mesh receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[TABLE_WIDTH, 0.2, TABLE_DEPTH]} />
          <meshStandardMaterial
            map={feltTexture}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      </RigidBody>

      {/* Visible low wood rails */}
      {/* Back rail */}
      <mesh castShadow receiveShadow position={[0, WALL_HEIGHT / 2, -halfDepth - wallHalfThickness]}>
        <boxGeometry args={[TABLE_WIDTH + wallThickness * 2, WALL_HEIGHT, wallThickness]} />
        <meshStandardMaterial map={woodTexture} roughness={0.7} />
      </mesh>

      {/* Front rail */}
      <mesh castShadow receiveShadow position={[0, WALL_HEIGHT / 2, halfDepth + wallHalfThickness]}>
        <boxGeometry args={[TABLE_WIDTH + wallThickness * 2, WALL_HEIGHT, wallThickness]} />
        <meshStandardMaterial map={woodTexture} roughness={0.7} />
      </mesh>

      {/* Left rail */}
      <mesh castShadow receiveShadow position={[-halfWidth - wallHalfThickness, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[wallThickness, WALL_HEIGHT, TABLE_DEPTH]} />
        <meshStandardMaterial map={woodTexture} roughness={0.7} />
      </mesh>

      {/* Right rail */}
      <mesh castShadow receiveShadow position={[halfWidth + wallHalfThickness, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[wallThickness, WALL_HEIGHT, TABLE_DEPTH]} />
        <meshStandardMaterial map={woodTexture} roughness={0.7} />
      </mesh>

      {/* Invisible tall wall colliders to contain dice */}
      {/* Back wall collider */}
      <RigidBody type="fixed" position={[0, CEILING_HEIGHT / 2, -halfDepth - wallHalfThickness]}>
        <CuboidCollider args={[halfWidth + wallThickness, CEILING_HEIGHT / 2, wallHalfThickness]} />
      </RigidBody>

      {/* Front wall collider */}
      <RigidBody type="fixed" position={[0, CEILING_HEIGHT / 2, halfDepth + wallHalfThickness]}>
        <CuboidCollider args={[halfWidth + wallThickness, CEILING_HEIGHT / 2, wallHalfThickness]} />
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
