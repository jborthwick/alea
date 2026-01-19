# Alea - Dice Poker Game

## Project Overview
A modern dice poker game inspired by Motion X Poker for iPhone, featuring realistic 3D physics, shake-to-roll on mobile, and a classic casino aesthetic.

## Tech Stack
- **Framework:** React 18 + TypeScript + Vite
- **3D Rendering:** Three.js via React Three Fiber (@react-three/fiber, @react-three/drei)
- **Physics:** Rapier WASM physics engine (@react-three/rapier)
- **State Management:** Zustand with persistence
- **PWA:** vite-plugin-pwa for offline support

## Project Structure
```
src/
├── components/
│   ├── Dice/           # Die.tsx, DiceGroup.tsx, DiceGeometry.ts
│   ├── Environment/    # PlaySurface.tsx, Lighting.tsx
│   ├── Game/           # Game.tsx, GameCanvas.tsx, GameUI.tsx
│   └── UI/             # BettingControls, ChipDisplay, HandResult, PayoutTable, RollCounter
├── game/               # constants.ts, handEvaluator.ts
├── hooks/              # useAudio.ts, useShakeDetection.ts
├── physics/            # faceDetection.ts, impulseCalculator.ts
├── store/              # gameStore.ts (Zustand)
└── types/              # game.ts
```

## Key Implementation Details

### Physics System
- Dice use Rapier rigid bodies with cuboid colliders
- Corrective torque applied when dice are slow to ensure they land flat
- Invisible walls + ceiling contain dice while keeping low visible rails
- Constants in `src/game/constants.ts` control physics behavior

### Roll Mechanics
- `rollTrigger` counter increments to trigger new rolls
- `finishRoll()` is guarded to only fire once per roll via refs
- `isRolling` state checked from store to prevent false roll completions
- Held dice are excluded from physics and rendered as static meshes

### Face Detection
- Quaternion-based detection in `src/physics/faceDetection.ts`
- Maps dice orientation to card values (9, 10, J, Q, K, A)

### Audio
- Procedurally generated sounds (no external audio files)
- Sounds: roll, collision, hold click, win, lose

## Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Game Rules
- 3 rolls per round
- Click/tap dice to hold after first roll
- Poker hands: 5-of-a-kind (100x) down to high card (0x)
- Betting with virtual chips, bankroll persisted to localStorage

## Known Quirks
- Dice may need a moment to settle on first load
- Shake detection requires permission on iOS (button provided)
