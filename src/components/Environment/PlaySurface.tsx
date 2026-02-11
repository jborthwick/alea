import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TABLE_WIDTH, TABLE_DEPTH, CEILING_HEIGHT, PLAY_AREA_DEPTH } from '../../game/constants';
import tableRoosterImg from '../../images/table_rooster.jpg';

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

// Fix UVs on an ExtrudeGeometry so the texture maps 0-1 across the surface
function fixExtrudeUVs(geometry: THREE.ExtrudeGeometry, width: number, depth: number) {
  const uv = geometry.attributes.uv;
  const pos = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const hw = width / 2;
  const hd = depth / 2;

  for (let i = 0; i < uv.count; i++) {
    const nz = normal.getZ(i);

    // Top face (extruded face pointing in +Z after extrusion, before rotation)
    if (nz > 0.5) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, (x + hw) / width, (y + hd) / depth);
    }
    // Side faces and bottom - use a dark solid color region by mapping to edge
    else {
      uv.setXY(i, 0.0, 0.0);
    }
  }
  uv.needsUpdate = true;
}

export function PlaySurface() {
  const tableTexture = useLoader(THREE.TextureLoader, tableRoosterImg);

  const halfWidth = TABLE_WIDTH / 2;
  const halfDepth = TABLE_DEPTH / 2;
  const wallThickness = 0.3;
  const wallHalfThickness = wallThickness / 2;

  const cornerRadius = 0.3;
  const roundedShape = useMemo(() => createRoundedRectShape(TABLE_WIDTH, TABLE_DEPTH, cornerRadius), []);
  const extrudeSettings = useMemo(() => ({
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 3,
  }), []);

  const tableGeometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(roundedShape, extrudeSettings);
    fixExtrudeUVs(geo, TABLE_WIDTH, TABLE_DEPTH);
    return geo;
  }, [roundedShape, extrudeSettings]);

  return (
    <group>
      {/* Main felt surface with rounded corners */}
      <RigidBody type="fixed" position={[0, -0.2, 0]}>
        <CuboidCollider args={[halfWidth, 0.2, halfDepth]} />
        <mesh receiveShadow position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={tableGeometry}>
          <meshPhysicalMaterial
            map={tableTexture}
            roughness={0.4}
            metalness={0.0}
            clearcoat={0.4}
            clearcoatRoughness={0.3}
            envMapIntensity={0.6}
            reflectivity={0.4}
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
