# SWITCHBOARD

**Daily Railway Dispatch Puzzle** — built with modular ES modules + Vite, designed for Reddit's **Game of the Day Hackathon 2026** (Devvit Web).

## How to Play
1. **Route Every Train to Its Matching Station:** Each train carries a color + shape badge (**● A** Crimson, **■ B** Cobalt, **▲ C** Amber).
2. **Flip Brass & Copper Switches:** Tap any circular switch junction to pivot its rail blades before dispatching (or live mid-run when unoccupied). **Copper Auto-Flip (`↻`)** switches automatically alternate after one train clears them.
3. **Time One-Shot Semaphores (`1×`):** Tap signal boxes (`GO / 2s / 4s`) to hold the first arriving train before diamond crossings (`✕`).
4. **Beat Par for Gold:** Pre-run experimenting is free—only final starting changes plus live mid-run flips count toward your Action score.

## Commands
```bash
npm install        # Install Vite
npm run verify     # Run headless 60Hz verifier across all shifts & Par Replays
npm run dev        # Start local dev server
npm run build      # Build production bundle
