# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An interactive design tool for an A-frame cabin's ground floor (kitchen + living). It renders the same cabin as a dimensioned **2D floor plan** (SVG) and an **interactive 3D model** (Three.js), switchable via tabs. The app is built iteratively from hand-drawn sketches the user provides as images.

## Commands

```bash
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # production build to dist/ (also the fastest way to type/syntax-check)
npm run preview   # serve the production build locally
```

There is no test suite, linter, or typechecker configured. **Verify changes with `npx vite build`** — a clean build is the standard "does it compile" check used throughout this project. For geometry/math changes, a quick `node -e "..."` script that re-derives the numbers is the common way to sanity-check values before trusting the render.

## Architecture

### `src/cabinData.js` is the single source of truth

All cabin geometry (wall dimensions, openings, studs, staircase, kitchen units) lives here as exported constants, in **meters**. Both the 2D and 3D views import from it, so **changing a dimension here updates both views automatically**. When adding or changing anything physical, change `cabinData.js` first; do not hardcode geometry in the view components.

Consumers:
- `src/FloorPlan.jsx` — 2D SVG plan (imported by `App.jsx`)
- `src/Cabin3D.jsx` — 3D scene (react-three-fiber)
- `src/Kitchen.jsx` / `src/Kitchen3D.jsx` — kitchen run, 2D and 3D

To keep the two views from drifting apart, derived layout is computed **once** and shared: `Kitchen.jsx` exports `kitchenUnitRects()` (per-unit plan-coordinate footprints), and `Cabin3D.jsx` / `Kitchen3D.jsx` import and reuse it rather than recomputing. Openings in `Cabin3D.jsx` are defined by **absolute plan-coordinate endpoints** derived from the same `cabinData` constants the 2D plan uses, for the same reason.

### Coordinate conventions (critical — easy to get wrong)

- **Plan coords** `(x, y)`: x increases right, **y increases downward** (south). `ROOM_POLYGON` is the L-shaped footprint, listed clockwise.
- **2D (SVG):** `px(m)` / `py(m)` map meters → pixels with a margin offset and `SCALE` (px per meter).
- **3D (world):** `worldX = planX`, `worldZ = planY` (identity on z — `toWorld` in `Cabin3D.jsx`), `worldY` = up. This identity mapping preserves handedness so the 3D model reads the same way round as the plan. A sign error here mirrors the model — when 3D geometry looks flipped/mirrored, suspect the z-mapping or a wall-rotation angle (`Math.atan2(-dy, dx)`).

### Walls represent INTERIOR dimensions

`ROOM_POLYGON` is the **interior (clear) face** — the sketch numbers are usable inside distances. Walls (`WALL_THICK = 0.20`) are built **outward** from that line in both views:
- 3D: each `WALL_SEGMENTS` entry has a precomputed outward normal `out`; walls are offset outward by half-thickness so the inner face sits on the dimension line. The left 8.20m wall is intentionally omitted (it's the A-frame roof slope meeting the floor, not a vertical wall).
- 2D: walls are drawn as a thick stroke centered on the interior line with the floor polygon painted on top, leaving only the outer half visible. Openings erase the full wall band; door/window symbols and jambs sit in that band.

Dimensions are drawn to **centerlines** (e.g. studs are dimensioned to their center, not face) — keep this consistent when adding new measurements.

### View layer

- `App.jsx` holds the `plan` / `3d` tab state.
- `FloorPlan.jsx`: self-contained SVG. Reusable `HDim`/`VDim` dimension components, color-coded by type (wall=gray, opening=blue, stud=brown). The SVG uses a `viewBox` with `width="100%"` so it scales responsively on mobile — preserve this when editing the `<svg>` element.
- `Cabin3D.jsx`: `<Canvas>` with OrbitControls. Walls are semi-transparent. **Click the floor to move the 1.80m scale figure** (`handlePick` → `insideRoom` point-in-polygon constraint). A toggle shows on-floor dimension lines.

react-three-fiber/drei versions are pinned to the v8/v9 line for React 18 compatibility — do not bump to v9/v10 (those require React 19).

## Deployment

Pushing to `main` auto-deploys to GitHub Pages via `.github/workflows/deploy.yml` (build → `dist/` → Pages). Live at https://gelly9.github.io/AFrameDesign/. `vite.config.js` sets `base: '/AFrameDesign/'` so assets resolve under the repo subpath — keep that base in sync with the repo name.

## Workflow notes

- The user drives design changes by sending photos of hand-drawn sketches; translate measured dimensions into `cabinData.js`. Sketch numbers occasionally conflict (e.g. inner-step values that don't close the polygon) — surface the conflict and confirm which dimension is authoritative rather than silently picking one.
- Commit after each discrete change when asked; keep commits scoped to one feature/fix.
