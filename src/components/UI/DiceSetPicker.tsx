import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import {
  createDiceGeometry,
  createDiceMaterials,
  releaseDiceMaterials,
} from '../Dice/DiceGeometry';
import {
  DICE_SET_MATERIALS,
  RAINBOW_DICE_COLORS,
} from '../../game/constants';
import type { DiceSetId } from '../../game/constants';
import type { DiceMaterialPreset } from '../Dice/DiceGeometry';
import './DiceSetPicker.css';

// ─── Config ──────────────────────────────────────────────────────────────────

const DICE_SET_OPTIONS: { id: DiceSetId; label: string }[] = [
  { id: 'alpha',           label: 'Casino'   },
  { id: 'blackmodern',     label: 'Noir'     },
  { id: 'transparentwhite', label: 'Crystal' },
  { id: 'rainbow',         label: 'Rainbow'  },
];

// Shared geometry instance — same shape for all dice sets
const sharedGeometry = createDiceGeometry();

// ─── Spinning die mesh (lives inside a Canvas) ────────────────────────────────

// Pre-parsed THREE.Color objects for the rainbow cycle (created once)
const RAINBOW_THREE_COLORS = RAINBOW_DICE_COLORS.map((hex) => new THREE.Color(hex));
const RAINBOW_COLOR_COUNT = RAINBOW_THREE_COLORS.length;
// How many seconds to spend on each color
const RAINBOW_CYCLE_SPEED = 1.2; // seconds per color

function SpinningDie({ diceSet }: { diceSet: DiceSetId }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const preset = DICE_SET_MATERIALS[diceSet] as DiceMaterialPreset;

  const materials = useMemo(
    () => createDiceMaterials(preset, diceSet),
    [preset, diceSet],
  );

  // For rainbow, clone materials and apply the first rainbow tint so the preview
  // shows a coloured glass die rather than plain crystal.
  const displayMaterials = useMemo(() => {
    if (diceSet !== 'rainbow') return materials;
    return (materials as THREE.MeshPhysicalMaterial[]).map((m) => {
      const clone = m.clone() as THREE.MeshPhysicalMaterial;
      clone.attenuationColor = new THREE.Color(RAINBOW_DICE_COLORS[0]);
      clone.emissive = new THREE.Color(RAINBOW_DICE_COLORS[0]);
      clone.emissiveIntensity = 0.25;
      return clone;
    });
  }, [materials, diceSet]);

  // Release base materials on unmount; dispose rainbow clones
  useEffect(() => {
    return () => {
      releaseDiceMaterials(preset, diceSet);
      if (diceSet === 'rainbow') {
        (displayMaterials as THREE.MeshPhysicalMaterial[]).forEach((m) => m.dispose());
      }
    };
  }, [preset, diceSet, displayMaterials]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    meshRef.current.rotation.z = t * 0.5;
    meshRef.current.rotation.x = Math.PI / 4;

    // Cycle rainbow die through all colors
    if (diceSet === 'rainbow') {
      const cycle = (t / RAINBOW_CYCLE_SPEED) % RAINBOW_COLOR_COUNT;
      const fromIdx = Math.floor(cycle) % RAINBOW_COLOR_COUNT;
      const toIdx = (fromIdx + 1) % RAINBOW_COLOR_COUNT;
      const alpha = cycle - Math.floor(cycle);
      const blended = RAINBOW_THREE_COLORS[fromIdx].clone().lerp(RAINBOW_THREE_COLORS[toIdx], alpha);
      (displayMaterials as THREE.MeshPhysicalMaterial[]).forEach((m) => {
        m.attenuationColor.copy(blended);
        m.emissive.copy(blended);
        m.needsUpdate = false; // color changes don't need full recompile
      });
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={sharedGeometry}
      material={displayMaterials}
      scale={1.2}
    />
  );
}

// ─── Small R3F Canvas for one dice set preview ────────────────────────────────

// Canvas background matches the card background: rgba(255,255,255,0.05) over
// the panel's rgb(18,16,12) ≈ #181614. All four canvases use the same value so
// the canvas edge is invisible against the card it sits on.
const CANVAS_BG = '#181614';

function DiceSetPreviewCanvas({ diceSet }: { diceSet: DiceSetId }) {
  const isGlass = diceSet === 'transparentwhite' || diceSet === 'rainbow';

  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 0, 2.2], fov: 45 }}
      style={{ width: '100%', height: '100%', background: CANVAS_BG }}
    >
      <color attach="background" args={[CANVAS_BG]} />
      <ambientLight intensity={isGlass ? 0.15 : 0.25} />
      <directionalLight position={[3, 2, 2]} intensity={isGlass ? 0.4 : 0.6} castShadow={false} />
      <pointLight position={[-2, -1, 3]} intensity={0.3} />
      {/* Interior light — sits at the die's centre; illuminates glass from within */}
      {isGlass && <pointLight position={[0, 0, 0]} intensity={8} color="#ffffff" />}
      <Environment preset="city" backgroundIntensity={0} environmentIntensity={isGlass ? 2.5 : 1.2} />
      {/* Emissive back-panel: dark emissive plane behind the die — transmission
          rendering samples this through the glass body, giving it depth without
          adding a distracting colour splash. */}
      {isGlass && (
        <mesh position={[0, 0, -0.7]}>
          <planeGeometry args={[0.7, 0.7]} />
          <meshStandardMaterial
            color="#050a14"
            emissive="#050a14"
            emissiveIntensity={12}
            side={THREE.FrontSide}
          />
        </mesh>
      )}
      <SpinningDie diceSet={diceSet} />
    </Canvas>
  );
}

// ─── Single selectable card ───────────────────────────────────────────────────

function DiceSetCard({
  id,
  label,
  isSelected,
  onSelect,
}: {
  id: DiceSetId;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`dice-set-card${isSelected ? ' selected' : ''}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="dice-set-canvas-wrap">
        <DiceSetPreviewCanvas diceSet={id} />
      </div>
      <span className="dice-set-name">{label}</span>
    </button>
  );
}

// ─── Exported picker (used inside SettingsPanel) ──────────────────────────────

export function DiceSetPicker() {
  const selectedDiceSet = useGameStore((state) => state.selectedDiceSet);
  const setDiceSet = useGameStore((state) => state.setDiceSet);

  return (
    <div className="dice-picker-grid">
      {DICE_SET_OPTIONS.map(({ id, label }) => (
        <DiceSetCard
          key={id}
          id={id}
          label={label}
          isSelected={selectedDiceSet === id}
          onSelect={() => setDiceSet(id)}
        />
      ))}
    </div>
  );
}
