import * as THREE from 'three';
import { preloadAllDiceSets } from '../components/Dice/DiceGeometry';
import type { TableId } from './constants';

// Static imports for Vite bundling
import tableRoosterImg from '../images/table_rooster.jpg';
import tableBluejayImg from '../images/table_bluejay.jpg';
import tableMartinImg from '../images/table_martin.jpg';
import tableParrotImg from '../images/table_parrot.jpg';
import tableOwlImg from '../images/table_owl.jpg';

const TABLE_IMAGES: Record<TableId, string> = {
  rooster: tableRoosterImg,
  bluejay: tableBluejayImg,
  martin: tableMartinImg,
  parrot: tableParrotImg,
  owl: tableOwlImg,
};

// Cached textures, populated by preloadAllAssets()
const textureCache: Partial<Record<TableId, THREE.Texture>> = {};

const loader = new THREE.TextureLoader();

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

/**
 * Preload all game assets in parallel:
 * - All dice set PNGs (into DiceGeometry's image cache)
 * - 5 table background JPGs (into textureCache)
 *
 * Call once at app startup before rendering any game content.
 */
export async function preloadAllAssets(): Promise<void> {
  const tablePromises = (Object.entries(TABLE_IMAGES) as [TableId, string][]).map(
    async ([tableId, url]) => {
      const texture = await loadTexture(url);
      textureCache[tableId] = texture;
    }
  );

  await Promise.all([
    preloadAllDiceSets(),
    ...tablePromises,
  ]);
}

/**
 * Get a preloaded table texture. Must call preloadAllAssets() first.
 */
export function getTableTexture(tableId: TableId): THREE.Texture {
  const texture = textureCache[tableId];
  if (!texture) {
    throw new Error(`Table texture for "${tableId}" not preloaded. Call preloadAllAssets() first.`);
  }
  return texture;
}
