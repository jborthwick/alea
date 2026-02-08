# Alea

A modern dice poker game with realistic 3D physics, inspired by Motion X Poker for iPhone. Play head-to-head against an AI opponent.

**[Play Now](https://jborthwick.github.io/alea/)**

## Features

- **Head-to-Head Play** - Compete against an AI opponent who rolls and holds dice with a smart strategy
- **Realistic 3D Physics** - Dice roll and bounce naturally using the Rapier physics engine
- **Shake to Roll** - On mobile devices, shake your phone to roll the dice
- **Classic Poker Hands** - From High Card to Five of a Kind
- **Betting System** - Virtual chips with persistent bankroll
- **PWA Support** - Install as an app on your device for offline play
- **Mobile Optimized** - Touch-friendly UI with haptic feedback (Android)

## How to Play

1. Place your bet using the + and - buttons
2. Tap **PLACE BET & ROLL** to roll all 5 dice
3. Both you and the AI opponent roll simultaneously
4. Tap your dice to hold them between rolls
5. You have 3 rolls per round to make the best poker hand
6. Best hand wins — beat the opponent to win 2x your bet

## Hand Rankings (Highest to Lowest)

| Hand |
|------|
| Five of a Kind |
| Four of a Kind |
| Straight |
| Full House |
| Three of a Kind |
| Two Pair |
| One Pair |
| High Card |

**Win** = 2x bet returned | **Tie** (same rank) = bet returned | **Lose** = bet lost

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
