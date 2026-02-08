# TODO

## Bugs
- [x] Allow holding all 5 dice on the first roll (currently can only hold after first roll completes, but should be able to hold all 5 if you want to keep them)

## Future Enhancements
- [x] Add haptic feedback on mobile when dice collide (Android only - iOS Safari doesn't support Vibration API)
- [x] Add tilt-based camera movement on mobile (removed - now using fixed overhead camera)
- [ ] Drag-to-roll gesture on desktop

---

## Recent Fix: Game Crashes on "New Round" (Rapier WASM Errors)

### Symptoms
- Pressing "New Round" caused the 3D scene to disappear
- Console flooded with Rapier WASM errors: `expected instance of _EA`, `null pointer passed to rust`
- Previously-held dice didn't reset correctly (rolled around instead of snapping to pre-roll)
- Clicking dice to hold them played sound but didn't visually move them

### Root Cause
`Die.tsx` had three conditional return paths — `<mesh>` for pre-roll, `<mesh>` for held, and `<RigidBody>` for active physics. When `newRound` changed `gamePhase` to `'betting'`, React unmounted the `<RigidBody>`, destroying the Rapier physics body while the WASM physics loop still held references to it.

### Fix Strategy (implemented, working)

**Principle: Never unmount `<RigidBody>` — always keep it mounted and control position imperatively.**

#### 1. `Die.tsx` — Always-mounted RigidBody with inline `useFrame` parking

Instead of conditional rendering, the component always renders a single `<RigidBody>`. All positioning logic lives inside `useFrame`, which runs every animation frame and reads current state with zero delay:

```
useFrame:
  if gamePhase === 'betting'        → park at pre-roll position (ace-up)
  else if isHeld && !isPhysicsActive → park at held position (preserving settled rotation)
  else                               → let physics run (settling, face detection, etc.)
```

Key refs:
- `isPhysicsActive` — set `true` on roll trigger, set `false` on settle. Prevents held dice from being parked mid-roll.
- `settledRotation` — captures the quaternion when a die settles, so held dice keep their face orientation.

Why `useFrame` instead of `useEffect`: Effects fire after render with potential multi-frame delays. `useFrame` reads state every frame with zero lag — critical for physics synchronization.

#### 2. `gameStore.ts` — Reset dice in place (don't recreate)

`newRound()` and `resetBankroll()` now use `.map()` to reset dice values/holds on existing objects instead of calling `createInitialDice()`. This avoids React unmounting/remounting the `<Die>` components (and their `<RigidBody>` children).

### Why This Works
- Rapier bodies are never destroyed during gameplay — only on full page unmount
- `useFrame` provides frame-perfect state synchronization (no effect timing gaps)
- The parked code path is lighter than the physics settling path (just `setTranslation`/`setRotation`/zero velocity)

### What To Reassess
- Is the always-mounted approach the right long-term strategy? (Yes — this is standard practice with Rapier + R3F)
- Any edge cases where `isPhysicsActive` gets stuck? (Covered: reset on park, cleared on settle)
- Performance: parking logic in `useFrame` is trivial — 6 setter calls per parked die per frame

### Commit
```
Fix game crashes on "New Round" by keeping RigidBody always mounted

Use always-mounted RigidBody with useFrame parking instead of conditional
rendering. When gamePhase changes, park dice imperatively rather than
unmounting the RigidBody, which was causing Rapier WASM null pointer errors.

Changes:
- Die.tsx: Single RigidBody that stays mounted, useFrame handles all positioning
- gameStore.ts: Reset dice in place via .map() instead of recreating array
```
