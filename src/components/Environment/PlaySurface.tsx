import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useMemo } from 'react';
import { TABLE_WIDTH, TABLE_DEPTH, CEILING_HEIGHT, PLAY_AREA_DEPTH, TABLE_CONFIGS, TABLE_EMISSIVE_INTENSITY } from '../../game/constants';
import { useGameStore } from '../../store/gameStore';
import { getTableTexture } from '../../game/preloader';

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

// Create a rim/frame shape (outer rect with inner rect hole)
function createRimShape(
  outerWidth: number, outerDepth: number, outerRadius: number,
  innerWidth: number, innerDepth: number, innerRadius: number,
): THREE.Shape {
  const outer = createRoundedRectShape(outerWidth, outerDepth, outerRadius);

  // Create inner cutout as a hole (wound in opposite direction)
  const hole = new THREE.Path();
  const ihw = innerWidth / 2;
  const ihd = innerDepth / 2;
  const ir = Math.min(innerRadius, ihw, ihd);

  hole.moveTo(-ihw + ir, -ihd);
  hole.lineTo(ihw - ir, -ihd);
  hole.quadraticCurveTo(ihw, -ihd, ihw, -ihd + ir);
  hole.lineTo(ihw, ihd - ir);
  hole.quadraticCurveTo(ihw, ihd, ihw - ir, ihd);
  hole.lineTo(-ihw + ir, ihd);
  hole.quadraticCurveTo(-ihw, ihd, -ihw, ihd - ir);
  hole.lineTo(-ihw, -ihd + ir);
  hole.quadraticCurveTo(-ihw, -ihd, -ihw + ir, -ihd);

  outer.holes.push(hole);
  return outer;
}

interface PlaySurfaceProps {
  tableEmissive?: number;
}

export function PlaySurface({ tableEmissive = TABLE_EMISSIVE_INTENSITY }: PlaySurfaceProps) {
  const selectedTable = useGameStore((state) => state.selectedTable);
  const tableId = selectedTable ?? 'rooster';
  const rimColor = TABLE_CONFIGS[tableId].rimColor;
  const tableTexture = getTableTexture(tableId);

  const effectiveEmissive = tableEmissive;

  const halfWidth = TABLE_WIDTH / 2;
  const halfDepth = TABLE_DEPTH / 2;
  const wallThickness = 0.3;
  const wallHalfThickness = wallThickness / 2;

  const cornerRadius = 0.3;
  const rimWidth = 0.25;
  const rimHeight = 0.35;

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

  // Rim geometry: outer shell minus inner cutout
  const rimShape = useMemo(() => createRimShape(
    TABLE_WIDTH + rimWidth * 2, TABLE_DEPTH + rimWidth * 2, cornerRadius + rimWidth,
    TABLE_WIDTH, TABLE_DEPTH, cornerRadius,
  ), []);
  const rimExtrudeSettings = useMemo(() => ({
    depth: rimHeight,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  }), []);
  const rimGeometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(rimShape, rimExtrudeSettings);
  }, [rimShape, rimExtrudeSettings]);

  return (
    <group>
      {/* Large backdrop plane below the table — gives transmissive (glass) materials
          something to refract against when dice fly above the table edges.
          Without this, the transmission FBO samples empty/white where no geometry exists. */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#111118" />
      </mesh>

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
            emissive={effectiveEmissive > 0 ? '#ffffff' : '#000000'}
            emissiveMap={effectiveEmissive > 0 ? tableTexture : null}
            emissiveIntensity={effectiveEmissive}
          />
        </mesh>
      </RigidBody>

      {/* Visible rim/bumper around table edge */}
      <mesh
        castShadow
        receiveShadow
        position={[0, 0.2 + rimHeight, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={rimGeometry}
      >
        <meshPhysicalMaterial
          color={rimColor}
          roughness={0.35}
          metalness={0.05}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
        />
      </mesh>

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

      {/* Left wall collider - extends full depth + wall thickness for corner coverage */}
      <RigidBody type="fixed" position={[-halfWidth - wallHalfThickness, CEILING_HEIGHT / 2, 0]}>
        <CuboidCollider args={[wallHalfThickness, CEILING_HEIGHT / 2, halfDepth + wallThickness]} />
      </RigidBody>

      {/* Right wall collider - extends full depth + wall thickness for corner coverage */}
      <RigidBody type="fixed" position={[halfWidth + wallHalfThickness, CEILING_HEIGHT / 2, 0]}>
        <CuboidCollider args={[wallHalfThickness, CEILING_HEIGHT / 2, halfDepth + wallThickness]} />
      </RigidBody>

      {/* Invisible ceiling collider */}
      <RigidBody type="fixed" position={[0, CEILING_HEIGHT, 0]}>
        <CuboidCollider args={[halfWidth + wallThickness, 0.1, halfDepth + wallThickness]} />
      </RigidBody>
    </group>
  );
}
