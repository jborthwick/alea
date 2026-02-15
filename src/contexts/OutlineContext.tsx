import { createContext, useContext } from 'react';
import * as THREE from 'three';

interface OutlineContextValue {
  addObject: (obj: THREE.Object3D) => void;
  removeObject: (obj: THREE.Object3D) => void;
}

const OutlineContext = createContext<OutlineContextValue>({
  addObject: () => {},
  removeObject: () => {},
});

export const OutlineProvider = OutlineContext.Provider;

export function useOutlineContext() {
  return useContext(OutlineContext);
}
