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
├── App.tsx              # Root component (routes between TableSelect lobby and Game)
├── main.tsx             # Entry point
├── index.css            # Global styles + CSS custom properties (theme colors)
├── components/
│   ├── Dice/            # Die.tsx, DiceGroup.tsx, DiceGeometry.ts, OpponentDice.tsx
│   ├── Environment/     # PlaySurface.tsx, Lighting.tsx
│   ├── Game/            # Game.tsx, GameCanvas.tsx, GameUI.tsx (+ Game.css, GameUI.css)
│   └── UI/              # TableSelect, ChipDisplay, HandResult, PayoutTable, RollCounter, SettingsPanel (+ TableSelect.css, UI.css, SettingsPanel.css)
├── game/                # constants.ts, handEvaluator.ts, opponentAI.ts
├── hooks/               # useAudio.ts, useHaptics.ts, useShakeDetection.ts, usePhysicsDebug.ts
├── images/              # Dice face textures (dice_set_alpha_*.png), suit SVGs, table felt images (table_*.jpg)
├── physics/             # faceDetection.ts, impulseCalculator.ts
├── store/               # gameStore.ts (Zustand)
└── types/               # game.ts
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
- Held dice are parked imperatively (z: -1.5) by `useFrame`, NOT unmounted
- Pre-roll dice display at (z: 1.5) with Ace face up, parked by `useFrame`
- Die.tsx uses `isPhysicsActive` ref to track when physics should run vs when to park
- `settledRotation` ref preserves die orientation when held

### AI Opponent System
- Player and AI opponent roll simultaneously across 3 shared rolls
- Opponent dice are smaller, positioned above the play surface in static slots
- During rolls, opponent dice spin in place via `useFrame` rotation (no physics)
- After player dice settle, opponent dice spin for 500ms then snap to their values
- AI uses a basic smart hold strategy in `src/game/opponentAI.ts` (keeps pairs, trips, straights, full houses)
- Opponent values are pre-determined at roll start; spin animation hides them until reveal
- Win = 2x bet returned, Tie (identical hands) = push (bet returned), Lose = bet lost
- High-card tiebreaker: when both players have the same hand rank, compare card values (pair of Aces beats pair of Kings)

### Face Detection
- Quaternion-based detection in `src/physics/faceDetection.ts`
- Maps dice orientation to card values (9, 10, J, Q, K, A)
- Inverse quaternion mapping in `OpponentDice.tsx` to display specific values face-up

### Table Selection & Theming
- Lobby screen (`TableSelect.tsx`) shown when `selectedTable` is `null`; selecting a table enters the game
- 5 tables defined in `TABLE_CONFIGS` in `constants.ts`: Rooster (free/$0, red), Bluejay ($10, blue), Martin ($50, purple), Parrot ($100, green), Owl ($200, gray)
- Each table has: fixed bet amount, accent color (RGB triplet), accent-dark color, rim color (hex), and felt image
- `applyTableTheme(tableId)` sets `--accent` and `--accent-dark` CSS custom properties on `document.documentElement`; `resetDefaultTheme()` restores lobby gold theme
- `PlaySurface.tsx` dynamically selects the felt texture and rim color from `TABLE_CONFIGS` based on `selectedTable`
- `selectedTable` is persisted to localStorage; theme is re-applied on hydration via `onRehydrateStorage`
- `returnToLobby()` resets game state and returns to table selection; `resetBankroll()` also returns to lobby

### CSS Architecture
- Global theme colors defined as CSS custom properties in `src/index.css` (e.g., `--bg`, `--accent`, `--win`, `--lose`)
- Colors stored as raw RGB triplets for alpha compositing: `var(--accent)` → use as `rgb(var(--accent))` or `rgba(var(--accent), 0.5)`
- `--accent` and `--accent-dark` are overridden dynamically per table via JS (see `applyTableTheme`)
- Component CSS co-located with components: `Game.css`, `GameUI.css`, `UI.css`, `SettingsPanel.css`, `TableSelect.css`

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
- Camera FOV: 50° on mobile, 45° on desktop (prevents dice cutoff)
- Hand comparison modal: 32% padding-top on mobile vs 12% on desktop
- Reduced dice momentum on mobile to prevent off-screen rolls

## Commands
```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # TypeScript check + Vite build for production
npm run lint     # ESLint check
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
- Select a table from the lobby to set your bet (Rooster is free, others cost $10–$200)
- Shared bankroll persisted to localStorage; tables disabled when bankroll is insufficient

## Working with the Codebase

### Key Files to Read First
- `src/store/gameStore.ts` - Central state management, all game actions live here
- `src/game/constants.ts` - Table definitions (TABLE_CONFIGS), physics tuning, table dimensions, timing values
- `src/components/Dice/DiceGroup.tsx` - Orchestrates dice rolling and settlement detection
- `src/game/opponentAI.ts` - AI hold strategy and opponent dice value generation

### Common Modifications

**Adjusting physics behavior:**
Edit constants in `src/game/constants.ts`. Key values:
- `BASE_IMPULSE` - Base force for dice throws (currently 22)
- `MIN/MAX_ANGULAR_VELOCITY` - Spin speed range (30-55)
- Roll momentum tuning in `impulseCalculator.ts` lines 45-47:
  - X spread: `baseImpulse * 0.5` (horizontal)
  - Y impulse: `baseImpulse * 0.35` (upward arc)
  - Z momentum: `baseImpulse * (0.2-0.5)` (forward/toward camera)

**Adjusting opponent dice layout:**
Edit constants in `src/game/constants.ts`:
- `OPPONENT_DICE_SIZE` - Scale of opponent dice (default 0.45)
- `OPPONENT_DICE_Y` / `OPPONENT_DICE_Z` - Position above the play surface
- `OPPONENT_DICE_SPACING` - Horizontal spacing between opponent dice

**Adding a new sound:**
1. Add generation function in `src/hooks/useAudio.ts` (sounds are procedurally generated)
2. Add to the `sounds` object returned by the hook
3. Call via `sounds.yourSound.play()` from components

**Adding a new table:**
1. Add felt image to `src/images/table_<name>.jpg`
2. Add entry to `TABLE_CONFIGS` in `constants.ts` (id, name, bet, accent, accentDark, rimColor)
3. Add id to the `TableId` type union and `TABLE_ORDER` array
4. Import the image in `PlaySurface.tsx` and add to `TABLE_IMAGES` map

**Modifying game state:**
All state changes go through Zustand actions in `gameStore.ts`. Pattern:
```typescript
yourAction: () => set((state) => ({ ...changes }))
```

**CRITICAL when modifying dice array:** Use `.map()` to reset dice values/holds on existing objects. NEVER use `createInitialDice()` during gameplay as it recreates the array and causes React to unmount/remount Die components (triggering Rapier crashes). See `newRound()` and `resetBankroll()` in gameStore.ts for correct pattern.

**Using the physics debug panel (Leva):**
`usePhysicsDebug.ts` exposes a Leva GUI for live-tuning gravity, mass, restitution, friction, damping, and dice size. "Copy Values" button copies tuned constants to clipboard for pasting into `constants.ts`.

### Development Gotchas
- **CRITICAL - RigidBody lifecycle:** Die components use always-mounted `<RigidBody>` that NEVER unmounts during gameplay. The `useFrame` hook parks dice imperatively by setting position/rotation when not physics-active. NEVER use conditional rendering that unmounts RigidBody (causes Rapier WASM null pointer errors). See Die.tsx:68-72 for held position constants, Die.tsx:115-129 for parking logic.
- **Roll completion logic:** The `finishRoll()` function uses refs to prevent double-firing. If modifying roll logic, ensure `finishRollCalledForTrigger` ref is properly managed.
- **Opponent resolution timing:** `finishRoll()` sets `opponentIsRolling: true`, then uses a 500ms `setTimeout` to resolve. Both `isRolling` and `opponentIsRolling` must be checked when guarding against premature rolls (in both `GameUI.tsx` and the store's `rollDice` action).
- **Physics constants are interdependent:** Changing one value (e.g., impulse force) may require adjusting others (e.g., wall height, settling threshold).
- **Always test on mobile:** Touch interactions, shake detection, and safe area insets behave differently than desktop.
- **Held dice rendering:** Held dice skip physics entirely - positioned imperatively in useFrame (z: -1.5 for held, z: 1.5 for pre-roll). The RigidBody stays mounted but velocities are zeroed and position/rotation set directly.
- **Opponent dice are purely visual:** They use `useFrame` for spin animation and quaternion snapping — no physics involved. See `OpponentDice.tsx`.
- **Hand comparison modal positioning:** Modal sits between opponent dice (top) and player held dice. Desktop: 12% padding-top, Mobile: 32% padding-top. Opponent hand name smaller (1rem), player hand name larger (1.5rem), displayed vertically with opponent above.
- **Mobile FOV adjustment:** Camera FOV is wider on mobile (50°) vs desktop (45°) to prevent dice cutoff on narrow screens. Check `GameCanvas.tsx` line 19-20.
- **Dice roll momentum:** X spread and Z momentum have been reduced in impulseCalculator.ts (0.5x and 0.2-0.5x respectively) to prevent dice flying off-screen on mobile.

## Known Quirks
- Dice may need a moment to settle on first load
- Shake detection requires permission on iOS - must be re-enabled each page load (iOS limitation)
- DeviceMotion API requires HTTPS (won't work on local network without SSL)
- Theme color mismatch: `index.html` meta tag uses `#12100c`, PWA manifest in `vite.config.ts` uses `#1a1a2e` — keep in sync if changing theme
