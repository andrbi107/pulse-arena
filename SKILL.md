---
name: pulse-arena
description: A neon top-down twin-stick survival shooter PWA where a glowing cyan dot fights waves of enemy dots in a bounded arena.
---

# Pulse Arena

## What this skill gives the model

After reading this skill, the model understands:
- the genre and core loop of Pulse Arena (top-down twin-stick arena survival shooter)
- the exact mechanics (player, enemy archetypes, waves, boss, scoring, lives, invulnerability)
- the controls (touch dpad + auto-aim FIRE button, keyboard WASD/arrows + Space, mouse aim + click)
- the PWA structure required (manifest, service worker, SVG icon)
- the file layout and how to deploy on GitHub Pages

## Game design

Pulse Arena is a top-down 2D twin-stick survival shooter rendered entirely with HTML5 `<canvas>` primitives — no images, no libraries, no external assets. The aesthetic is minimalist neon: a dark navy/black arena with a faint scrolling grid, a cyan player dot with a glowing trail and a directional turret line, and enemy dots in magenta (normal circles), orange (fast squares), and red (tanky triangles). Bullets are thin yellow streaks. A large red boss dot appears every fifth level with its own health bar drawn above it.

The objective is to survive as many waves as possible. Each level spawns a fixed number of enemies that enter from the arena edges and chase the player. The player moves with one stick (WASD/arrows or the on-screen dpad) and aims/fires with the other (mouse, or an auto-aim FIRE button on touch). Clearing every enemy in a wave advances to the next level, which is larger, faster, and more varied. The player starts with three lives; touching an enemy costs one life and grants one second of invulnerability (blinking). Losing all lives ends the run.

Scoring is straightforward: ten points per enemy killed, one hundred per wave cleared, five hundred per boss defeated. The best score persists across sessions in `localStorage` under the key `pulseArena.best` and is shown on the start and game-over screens. Difficulty ramps with both enemy speed and spawn count each level, and every fifth level is a boss encounter with scaling health.

Art direction is deliberately restrained: every shape is drawn with `arc`, `fillRect`, `translate`, and `rotate`; all color is plain hex; glow is faked with `shadowBlur`; death is a short particle burst in the enemy's color; damage is a brief screen shake plus a red flash. Nothing is loaded from the network at runtime.

## Mechanics in detail

- **Player**: cyan circle (radius 14px), speed 250 px/s, bounded by the arena edges. Leaves a short fading trail of recent positions. A turret line points in the current aim direction with a yellow tip dot.
- **Movement**: keyboard WASD/arrows produce a normalized vector; the on-screen dpad (touch) produces an analog vector from the knob offset. Diagonal movement is supported. The player is clamped to `[radius, W-radius]` on each axis.
- **Aiming & firing**: mouse aim updates the turret toward the cursor; holding the mouse button auto-fires every 0.16s. On touch, a FIRE button auto-aims at the nearest enemy and auto-fires while held. Keyboard: Space fires toward the current facing (last movement direction). Bullets travel at 560 px/s and live ~1s.
- **Enemy archetypes**: `normal` (magenta circle, hp 1, base speed), `fast` (orange square, hp 1, 1.7× speed), `tank` (red triangle, hp 3, 0.65× speed). The spawn mix shifts toward fast/tank as levels rise.
- **Boss**: every 5th level spawns one boss (large red circle, radius 38) plus a few minions. Boss hp scales with the cycle (base 18, +10 per cycle). Boss contact damages the player but is knocked back rather than destroyed. Boss death awards 500 points and a bigger particle burst plus screen shake.
- **Waves**: level N spawns `5 + N*2` regular enemies (boss levels use 1 boss + `3 + cycle` minions). Enemies spawn one at a time from a random edge, at least 260px from the player. Clearing the spawn queue and all live enemies advances the level.
- **Lives & invulnerability**: start with 3. Contact with an enemy (when not invulnerable) costs 1 life, destroys the contacting regular enemy, and grants 1s of invulnerability with a blinking player. 0 lives → game over.
- **Difficulty ramp**: enemy speed = `75 + (level-1)*7` px/s; spawn count grows linearly; boss hp grows per cycle.
- **Score**: +10 per enemy kill, +100 per wave clear, +500 per boss kill. Best persisted to `localStorage['pulseArena.best']`.
- **Audio**: optional WebAudio oscillator beeps for shoot/kill/hit/level-up/boss/game-over, guarded by try/catch and a mute toggle (M key or HUD button). No audio files.

## Controls

- **Touch**: left dpad (analog joystick) moves; right FIRE button auto-aims the nearest enemy and fires while held; HUD pause/mute buttons. Touch controls appear only on coarse-pointer devices.
- **Keyboard**: WASD or Arrow keys move; Space fires toward facing; P or Esc pauses; M mutes.
- **Mouse**: move to aim; hold left button to auto-fire toward the cursor.

## File layout

- `index.html` — entry point; links the manifest, stylesheet, and main.js; registers the service worker; holds the canvas, HUD, touch controls, and start/pause/game-over screens.
- `styles.css` — all responsive styling (clamp-based sizing, safe-area insets, touch-control visibility, screen overlays).
- `main.js` — the entire game (config, state, input, audio, spawning, update, render, loop).
- `manifest.json` — PWA manifest, `start_url` and `scope` `"./"`, orientation `any`, SVG icon.
- `sw.js` — service worker precaching the shell and serving it offline.
- `icon.svg` — cyan glowing dot on a dark background, used as the app icon.

## How to run / deploy

1. Open `index.html` directly in a browser, OR
2. Push the folder to a GitHub repo and enable Pages — the game runs from the repo root or a subfolder because all paths are relative.

## PWA install

The manifest + service worker make the game installable on Android/iOS/desktop. After first load it works offline.

## Customization hooks

All gameplay tuning lives in the `CFG` object at the top of `main.js`:
- `playerSpeed`, `playerRadius` — player feel.
- `bulletSpeed`, `bulletLife`, `fireInterval` — weapon behavior.
- `enemyBaseSpeed`, `enemySpeedPerLevel` — difficulty ramp.
- `bossEvery`, `bossBaseHp`, `bossHpPerCycle` — boss cadence and toughness.
- `startLives`, `invulnDuration` — survivability.
- `scorePerKill`, `scorePerWave`, `scorePerBoss` — scoring.
- `ENEMY_TYPES` — per-archetype color, radius, hp, speed multiplier.
- `gridSize` — background grid density.

Colors are plain hex literals in `CFG`/`ENEMY_TYPES` and the render functions in `main.js`; the UI palette is mirrored as CSS variables in `styles.css` (`--player`, `--bullet`, `--enemy-*`, `--bg`).
