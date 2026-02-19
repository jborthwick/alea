import { useThree, useFrame } from '@react-three/fiber';
import { useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Sets up an EffectComposer with OutlinePass for highlighting held dice.
 *
 * Returns `addObject` / `removeObject` callbacks that GlowOverlay uses
 * to register and unregister meshes for outlining.
 *
 * Using a non-zero priority in useFrame takes over rendering from R3F's
 * auto-render so we render via the composer instead.
 */
export function useOutlineEffect() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  const { composer, outlinePass } = useMemo(() => {
    const comp = new EffectComposer(gl);

    const renderPass = new RenderPass(scene, camera);
    comp.addPass(renderPass);

    const resolution = new THREE.Vector2(size.width, size.height);
    const outline = new OutlinePass(resolution, scene, camera);
    outline.edgeStrength = 6;
    outline.edgeThickness = 1;
    outline.edgeGlow = 1.0;
    outline.visibleEdgeColor.set('#ffffff');
    outline.hiddenEdgeColor.set('#ffffff');
    outline.pulsePeriod = 5.0;
    comp.addPass(outline);

    const outputPass = new OutputPass();
    comp.addPass(outputPass);

    return { composer: comp, outlinePass: outline };
  }, [gl, scene, camera]);

  // Keep composer size in sync
  useEffect(() => {
    composer.setSize(size.width, size.height);
    // Update pixel ratio for retina displays
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }, [size, composer]);

  // Render via composer (priority 1 takes over from R3F auto-render)
  useFrame(() => {
    composer.render();
  }, 1);

  // Stable add/remove callbacks
  const addObject = useCallback((obj: THREE.Object3D) => {
    if (!outlinePass.selectedObjects.includes(obj)) {
      outlinePass.selectedObjects.push(obj);
    }
  }, [outlinePass]);

  const removeObject = useCallback((obj: THREE.Object3D) => {
    const idx = outlinePass.selectedObjects.indexOf(obj);
    if (idx !== -1) {
      outlinePass.selectedObjects.splice(idx, 1);
    }
  }, [outlinePass]);

  return { addObject, removeObject, outlinePass };
}
