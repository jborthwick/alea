import { useEffect, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useOutlineContext } from '../../contexts/OutlineContext';

interface GlowOverlayProps {
  visible: boolean;        // controlled by isHeld
  /** Ref to the die mesh to add/remove from the OutlinePass selection */
  dieMeshRef?: MutableRefObject<THREE.Mesh | null>;
}

/**
 * Registers / unregisters the die mesh with the scene-level OutlinePass.
 *
 * When visible=true the die mesh is added to OutlinePass.selectedObjects,
 * producing a glow outline around it. When visible=false or on unmount
 * the mesh is removed.
 *
 * No mesh is rendered by this component — the OutlinePass handles drawing.
 */
export function GlowOverlay({ visible, dieMeshRef }: GlowOverlayProps) {
  const { addObject, removeObject } = useOutlineContext();

  useEffect(() => {
    const mesh = dieMeshRef?.current;
    if (!mesh) return;

    if (visible) {
      addObject(mesh);
    } else {
      removeObject(mesh);
    }

    return () => {
      if (mesh) removeObject(mesh);
    };
  }, [visible, dieMeshRef, addObject, removeObject]);

  return null;
}
