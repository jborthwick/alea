# Alea - Dice Poker Game

## Project Overview
A modern dice poker game inspired by Motion X Poker for iPhone, featuring realistic 3D physics, shake-to-roll on mobile, and a classic casino aesthetic.

**Live Demo:** https://jborthwick.github.io/alea/

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
│   └── UI/             # BettingControls, ChipDisplay, HandResult, PayoutTable, RollCounter, SettingsPanel
├── game/               # constants.ts, handEvaluator.ts
├── hooks/              # useAudio.ts, useHaptics.ts, useShakeDetection.ts
├── physics/            # faceDetection.ts, impulseCalculator.ts
├── store/              # gameStore.ts (Zustand)
└── types/              # game.ts
```

## Key Implementation Details

### Physics System
- Dice use Rapier rigid bodies with cuboid colliders
- Corrective torque applied when dice are slow to ensure they land flat
- Invisible walls + ceiling contain dice while keeping low visible rails
- Inner barrier keeps dice in tappable area (away from bottom UI)
- Constants in `src/game/constants.ts` control physics behavior

### Roll Mechanics
- `rollTrigger` counter increments to trigger new rolls
- `finishRoll()` is guarded to only fire once per roll via refs
- `isRolling` state checked from store to prevent false roll completions
- Held dice are excluded from physics and rendered as static meshes

### Face Detection
- Quaternion-based detection in `src/physics/faceDetection.ts`
- Maps dice orientation to card values (9, 10, J, Q, K, A)

### Audio & Haptics
- Procedurally generated sounds (no external audio files)
- Sounds: roll, collision, hold click, win, lose
- Haptic feedback on Android (Vibration API)
- Note: iOS Safari does not support the Vibration API - haptics gracefully degrade

### Settings Panel
- Sound toggle (persisted to localStorage)
- Shake to roll toggle (NOT persisted - iOS resets permission on page reload)
- Reset score with confirmation modal

### Mobile Considerations
- Portrait-oriented table layout optimized for mobile
- Safe area insets for iOS devices (notch, home indicator)
- Dynamic viewport height (100dvh) for proper mobile browser chrome handling
- Shake detection only shown on actual mobile devices (filters out desktop Safari)

## Commands
```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
```

**Mobile testing with HTTPS:**
```bash
npm run dev -- --host --https
```
This exposes the server on your local network with a self-signed certificate. Access via your machine's IP address from a mobile device (accept the certificate warning). Required for testing shake detection and other DeviceMotion features.

## Deployment
Deployed to GitHub Pages via GitHub Actions. The workflow in `.github/workflows/deploy.yml` builds and deploys on push to main.

## Game Rules
- 3 rolls per round
- Click/tap dice to hold after first roll
- Poker hands: 5-of-a-kind (100x) down to high card (0x)
- Betting with virtual chips, bankroll persisted to localStorage

## Working with the Codebase

### Key Files to Read First
- `src/store/gameStore.ts` - Central state management, all game actions live here
- `src/game/constants.ts` - Physics tuning, table dimensions, timing values
- `src/components/Dice/DiceGroup.tsx` - Orchestrates dice rolling and settlement detection

### Common Modifications

**Adjusting physics behavior:**
Edit constants in `src/game/constants.ts`. Key values:
- `IMPULSE_FORCE` / `TORQUE_FORCE` - How hard dice are thrown
- `SETTLING_THRESHOLD` - Velocity below which dice are considered stopped
- `CORRECTIVE_TORQUE_*` - Controls how dice "snap" to flat positions

**Adding a new sound:**
1. Add generation function in `src/hooks/useAudio.ts` (sounds are procedurally generated)
2. Add to the `sounds` object returned by the hook
3. Call via `sounds.yourSound.play()` from components

**Modifying game state:**
All state changes go through Zustand actions in `gameStore.ts`. Pattern:
```typescript
yourAction: () => set((state) => ({ ...changes }))
```

### Development Gotchas
- **Roll completion logic:** The `finishRoll()` function uses refs to prevent double-firing. If modifying roll logic, ensure `hasFinishedRoll.current` is properly managed.
- **Physics constants are interdependent:** Changing one value (e.g., impulse force) may require adjusting others (e.g., wall height, settling threshold).
- **Always test on mobile:** Touch interactions, shake detection, and safe area insets behave differently than desktop.
- **Held dice rendering:** Held dice skip physics entirely and render as static meshes at fixed positions. See `DiceGroup.tsx` for the bifurcated rendering logic.

## Known Quirks
- Dice may need a moment to settle on first load
- Shake detection requires permission on iOS - must be re-enabled each page load (iOS limitation)
- DeviceMotion API requires HTTPS (won't work on local network without SSL)
