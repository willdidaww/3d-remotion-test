# Sample A — Single-file deterministic video (no Remotion)

An educational video, "Cara Kerja Mesin Gerinda" (how an angle grinder works),
built as **one `index.html`** that plays like a video and exports to MP4
frame-by-frame. This is the [bang-motion](https://github.com/bangtutorial/bang-motion)
approach, and it sidesteps the Remotion-3D problem entirely.

## Watch it (no install)

Open `index.html` by double-clicking it (or drag it into a browser). It needs
internet (Three.js loads from a CDN) but **no server and no `npm install`**.

- Autoplays, then loops.
- `index.html?debug=1` — adds a scrub bar + a clock so you can review any second.
- `index.html?clean=1` — no UI, no autoplay (used by the export script).
- Keys: `Space` = pause/resume, `R` = restart.

## Why this renders 3D when Remotion didn't

The whole scene is a **pure function of one time value `t`** (seconds). There is:

- **no `requestAnimationFrame` accumulation** — the rotor angle is the exact
  analytic integral of the RPM schedule, so `seek(10.0)` always draws the same
  frame;
- **no `Date.now()` / `performance.now()`** inside the drawing code — the live
  clock only *feeds* `seek(t)`, and `seek` is deterministic;
- **no `Math.random()`** in the render path — sparks use `Math.sin(t*…)`.

Because of that, a headless browser can **set** the time, wait for the paint,
screenshot, and repeat — no dropped frames, perfectly reproducible. (Remotion
failed because the original app drove itself with `requestAnimationFrame` +
OrbitControls damping, which a headless frame render never advances, and loaded
Three via an HTML import map the bundler can't honor.)

## Export to MP4

```bash
npm install                 # installs puppeteer + a headless Chrome
npm run export:frames       # writes frames/f00000.png … (1080x1920 @ 60fps)
npm run export:mp4          # needs ffmpeg on PATH -> angle-grinder.mp4
```

Or run the steps manually:

```bash
node scripts/export-frames.mjs
ffmpeg -framerate 60 -i frames/f%05d.png -c:v libx264 -pix_fmt yuv420p -crf 16 angle-grinder.mp4
```

Env overrides: `FPS=60 OUT=frames SCALE=1 node scripts/export-frames.mjs`.

## Format

- 1080×1920 (9:16) for Reels / Shorts / TikTok. The stage is pinned at that
  size and only *scaled* to fit your window, so the composition never shifts.
- 24 seconds, 6 narrated stages (Indonesian captions), continuous camera move,
  housing fade-to-reveal, copper current-glow, brush sparks, bevel-gear
  motor→spindle transfer, spinning disc.

## Files

```
index.html                 the whole video (markup + CSS + Three.js, inline)
scripts/export-frames.mjs  deterministic PNG-sequence exporter (puppeteer)
package.json               export scripts + puppeteer dev-dependency
```

> Note: the MP4 export must run on a machine where headless Chrome can start.
> It could not be rendered inside the build sandbox (headless Chrome is blocked
> there), but the file is correct by construction and runs on a normal desktop.
