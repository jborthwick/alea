# Alea - Dice Poker Game

## Project Overview
A modern dice poker game inspired by Motion X Poker for iPhone, featuring realistic 3D physics, shake-to-roll on mobile, head-to-head play against an AI opponent, and a classic casino aesthetic.

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
│   ├── Dice/           # Die.tsx, DiceGroup.tsx, DiceGeometry.ts, OpponentDice.tsx
│   ├── Environment/    # PlaySurface.tsx, Lighting.tsx
│   ├── Game/           # Game.tsx, GameCanvas.tsx, GameUI.tsx
│   └── UI/             # BettingControls, ChipDisplay, HandResult, PayoutTable, RollCounter, SettingsPanel
├── game/               # constants.ts, handEvaluator.ts, opponentAI.ts
├── hooks/              # useAudio.ts, useHaptics.ts, useShakeDetection.ts
├── physics/            # faceDetection.ts, impulseCalculator.ts
├── store/              # gameStore.ts (Zustand)
└── types/              # game.ts
```

## Key Implementation Details

### Physics System
- Dice use Rapier rigid bodies with cuboid colliders
- Corrective torque applied when dice are slow to ensure they land flat
- Invisible walls + ceiling contain dice on a rounded felt surface
- Inner barrier keeps dice in tappable area (away from bottom UI)
- Constants in `src/game/constants.ts` control physics behavior

### Roll Mechanics
- `rollTrigger` counter increments to trigger new rolls
- `finishRoll()` is guarded to only fire once per roll via refs
- `isRolling` and `opponentIsRolling` states checked to prevent false roll completions
- Held dice are excluded from physics and rendered as static meshes
- Pre-roll dice display as static meshes with Ace face up near the bottom of the play area

### AI Opponent System
- Player and AI opponent roll simultaneously across 3 shared rolls
- Opponent dice are smaller, positioned above the play surface in static slots
- During rolls, opponent dice spin in place via `useFrame` rotation (no physics)
- After player dice settle, opponent dice spin for 500ms then snap to their values
- AI uses a basic smart hold strategy in `src/game/opponentAI.ts` (keeps pairs, trips, straights, full houses)
- Opponent values are pre-determined at roll start; spin animation hides them until reveal
- Win = 2x bet returned, Tie (same hand rank) = push (bet returned), Lose = bet lost

### Face Detection
- Quaternion-based detection in `src/physics/faceDetection.ts`
- Maps dice orientation to card values (9, 10, J, Q, K, A)
- Inverse quaternion mapping in `OpponentDice.tsx` to display specific values face-up

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

**Mobile testing on local network:**
```bash
npm run dev -- --host
```
This exposes the server on your local network. Access via your machine's IP address from a mobile device.

**Note:** Testing shake detection requires HTTPS. The deployed GitHub Pages site has HTTPS, so for shake testing you can either deploy or temporarily add `@vitejs/plugin-basic-ssl` to the Vite config.

## Deployment
Deployed to GitHub Pages via GitHub Actions. The workflow in `.github/workflows/deploy.yml` builds and deploys on push to main.

## Game Rules
- Head-to-head against an AI opponent
- 3 rolls per round, shared between both players
- Click/tap dice to hold after first roll
- Poker hands: 5-of-a-kind down to high card
- Best hand wins the pot (2x bet); same rank = push
- Betting with virtual chips, bankroll persisted to localStorage

## Working with the Codebase

### Key Files to Read First
- `src/store/gameStore.ts` - Central state management, all game actions live here
- `src/game/constants.ts` - Physics tuning, table dimensions, timing values
- `src/components/Dice/DiceGroup.tsx` - Orchestrates dice rolling and settlement detection
- `src/game/opponentAI.ts` - AI hold strategy and opponent dice value generation

### Common Modifications

**Adjusting physics behavior:**
Edit constants in `src/game/constants.ts`. Key values:
- `IMPULSE_FORCE` / `TORQUE_FORCE` - How hard dice are thrown
- `SETTLING_THRESHOLD` - Velocity below which dice are considered stopped
- `CORRECTIVE_TORQUE_*` - Controls how dice "snap" to flat positions

**Adjusting opponent dice layout:**
Edit constants in `src/game/constants.ts`:
- `OPPONENT_DICE_SIZE` - Scale of opponent dice (default 0.45)
- `OPPONENT_DICE_Y` / `OPPONENT_DICE_Z` - Position above the play surface
- `OPPONENT_DICE_SPACING` - Horizontal spacing between opponent dice

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
- **Roll completion logic:** The `finishRoll()` function uses refs to prevent double-firing. If modifying roll logic, ensure `finishRollCalledForTrigger` ref is properly managed.
- **Opponent resolution timing:** `finishRoll()` sets `opponentIsRolling: true`, then uses a 500ms `setTimeout` to resolve. Both `isRolling` and `opponentIsRolling` must be checked when guarding against premature rolls (in both `GameUI.tsx` and the store's `rollDice` action).
- **Physics constants are interdependent:** Changing one value (e.g., impulse force) may require adjusting others (e.g., wall height, settling threshold).
- **Always test on mobile:** Touch interactions, shake detection, and safe area insets behave differently than desktop.
- **Held dice rendering:** Held dice skip physics entirely and render as static meshes at fixed positions. See `Die.tsx` for the bifurcated rendering logic (pre-roll static, held static, or physics-driven).
- **Opponent dice are purely visual:** They use `useFrame` for spin animation and quaternion snapping — no physics involved. See `OpponentDice.tsx`.

## Known Quirks
- Dice may need a moment to settle on first load
- Shake detection requires permission on iOS - must be re-enabled each page load (iOS limitation)
- DeviceMotion API requires HTTPS (won't work on local network without SSL)
