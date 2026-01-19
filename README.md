# Alea

A modern dice poker game with realistic 3D physics, inspired by Motion X Poker for iPhone.

**[Play Now](https://jborthwick.github.io/alea/)**

## Features

- **Realistic 3D Physics** - Dice roll and bounce naturally using the Rapier physics engine
- **Shake to Roll** - On mobile devices, shake your phone to roll the dice
- **Classic Poker Hands** - From High Card to Five of a Kind
- **Betting System** - Virtual chips with persistent bankroll
- **PWA Support** - Install as an app on your device for offline play
- **Mobile Optimized** - Touch-friendly UI with haptic feedback (Android)

## How to Play

1. Place your bet using the + and - buttons
2. Tap **PLACE BET & ROLL** to roll all 5 dice
3. Tap dice to hold them between rolls
4. You have 3 rolls per round to make the best poker hand
5. Win based on your hand's payout multiplier

## Hand Rankings

| Hand | Payout |
|------|--------|
| Five of a Kind | 100x |
| Four of a Kind | 25x |
| Full House | 8x |
| Straight | 6x |
| Three of a Kind | 3x |
| Two Pair | 2x |
| Pair (Jacks or Better) | 1x |

## Tech Stack

- React + TypeScript + Vite
- Three.js via React Three Fiber
- Rapier WASM physics engine
- Zustand for state management
- PWA with offline support

## Development

```bash
npm install
npm run dev
```

## License

MIT
