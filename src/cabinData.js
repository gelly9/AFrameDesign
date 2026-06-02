// Single source of truth for the cabin geometry.
// Both the 2D floor plan and the 3D view read from this module.
// All measurements are in METERS.

// ── Wall dimensions ───────────────────────────────────────────────
export const W_TOP    = 3.30   // top (back) wall
export const H_LEFT   = 8.20   // left wall (A-frame side, slopes down to floor in 3D)
export const W_BOTTOM = 6.60   // bottom (front) wall
export const H_RIGHT  = 4.80   // right outer wall
export const STEP_Y   = H_LEFT - H_RIGHT   // 3.40m — inner step vertical
export const STEP_W   = W_BOTTOM - W_TOP   // 3.30m — inner step horizontal

// ── 3D structure (will be tunable later) ──────────────────────────
export const WALL_HEIGHT = 2.50  // straight vertical walls
export const PEAK_HEIGHT = 5.00  // A-frame peak above the floor
export const ROOF_THICK  = 0.10  // visual roof slab thickness

// ── L-shape footprint (clockwise from top-left) ───────────────────
export const ROOM_POLYGON = [
  [0,        0      ],
  [W_TOP,    0      ],
  [W_TOP,    STEP_Y ],
  [W_BOTTOM, STEP_Y ],
  [W_BOTTOM, H_LEFT ],
  [0,        H_LEFT ],
]

// Wall thickness, and how the sketch dimensions are interpreted.
// ROOM_POLYGON is the INTERIOR (clear) face — your sketch numbers are
// the usable inside distances. Walls are built OUTWARD from this line.
export const WALL_THICK = 0.20

// Point-in-polygon (used to orient outward wall normals)
function _pip(x, y, poly) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

// ── Wall segments (used by the 3D view to build vertical walls) ──
// The LEFT wall (8.20m) is intentionally omitted — it's the A-frame
// slope meeting the floor, not a vertical wall.
// Each segment gets a unit OUTWARD normal `out` (plan coords).
export const WALL_SEGMENTS = [
  { id: 'top',         from: [0,        0      ], to: [W_TOP,    0      ] },
  { id: 'innerVert',   from: [W_TOP,    0      ], to: [W_TOP,    STEP_Y ] },
  { id: 'innerHoriz',  from: [W_TOP,    STEP_Y ], to: [W_BOTTOM, STEP_Y ] },
  { id: 'right',       from: [W_BOTTOM, STEP_Y ], to: [W_BOTTOM, H_LEFT ] },
  { id: 'bottom',      from: [W_BOTTOM, H_LEFT ], to: [0,        H_LEFT ] },
].map(seg => {
  const [ax, ay] = seg.from
  const [bx, by] = seg.to
  const dx = bx - ax, dy = by - ay
  const len = Math.hypot(dx, dy)
  let nx = -dy / len, ny = dx / len            // one normal
  const mx = (ax + bx) / 2, my = (ay + by) / 2
  if (_pip(mx + nx * 0.02, my + ny * 0.02, ROOM_POLYGON)) { nx = -nx; ny = -ny }
  return { ...seg, out: [nx, ny] }
})

// ── Entrance (bottom wall) ────────────────────────────────────────
export const ENTRANCE = {
  wall: 'bottom',
  fromLeft: 1.30,
  width:    3.80,
  height:   2.10,
}

// ── Terrace door (right wall) ─────────────────────────────────────
// 0.25m below the inner step wall (STEP_Y), 0.80m wide.
export const TERRACE_DOOR = {
  wall: 'right',
  fromTop: 0.25,       // gap below the inner step wall (STEP_Y)
  width:   0.80,
  height:  2.10,
}

// ── Bathroom door (inner 3.40m wall) ──────────────────────────────
export const BATHROOM_DOOR = {
  wall: 'innerVert',
  fromBottom: 0.80,
  width:      0.80,
  height:     2.10,
  swing:      'right',
}

// ── Window on right wall (1.30m from bottom, 1.20m tall) ──────────
export const RIGHT_WINDOW = {
  wall:       'right',
  fromBottom: 1.30,
  width:      1.20,    // vertical span on the plan
  height:     1.20,    // physical height of the window
  sillHeight: 0.90,
}

// ── Window on top wall (1.10m from right, 0.70m wide) ─────────────
export const TOP_WINDOW = {
  wall:      'top',
  fromRight: 1.10,
  width:     0.70,
  height:    0.80,
  sillHeight: 1.40,
}

// ── Wood studs (15×15 cm posts) ───────────────────────────────────
export const STUD_SIZE = 0.15
export const STUDS = [
  { id: 'S1', cx: W_BOTTOM - 1.20, cy: H_LEFT  - 2.30 },
  { id: 'S2', cx: 1.20,            cy: 3.30           },
  { id: 'S3', cx: 1.20,            cy: H_LEFT - 2.30 },
]

// ── Staircase ─────────────────────────────────────────────────────
// 1.00m wide × 2.50m run, running horizontally. Starts low at the
// terrace door (right end) and ascends to the LEFT. Sits against the
// inner step wall (top edge at y = STEP_Y); right edge 1m from right wall.
export const STAIR = {
  width: 1.00,                       // extent across travel (y)
  run:   2.50,                       // extent along travel (x)
  gapFromRightWall: 1.00,            // right edge offset left of W_BOTTOM
  treadDepth: 0.25,                  // tread spacing
  ascend: 'left',                    // rises toward the left (door is on the right)
}
// Derived footprint (plan coords)
export const STAIR_X2 = W_BOTTOM - STAIR.gapFromRightWall               // 5.60 (right)
export const STAIR_X1 = STAIR_X2 - STAIR.run                            // 3.10 (left)
export const STAIR_Y1 = STEP_Y                                         // 3.40 (against inner wall)
export const STAIR_Y2 = STAIR_Y1 + STAIR.width                          // 4.40 (bottom)

// ── Kitchen run ───────────────────────────────────────────────────
// A single 3.20m straight run along the RIGHT wall, starting at the
// bottom (6.60m) wall and running up (north). Counter depth 0.60m.
// Unit 01 is at the bottom; 06 (fridge) at the top. Widths in meters.
export const KITCHEN = {
  wall:   'right',    // runs along x = W_BOTTOM
  anchor: 'bottom',   // first unit starts at y = H_LEFT
  depth:  0.60,       // counter depth (into the room, -x)
  units: [
    { id: '01', type: 'cabinet',    label: 'End cabinet, drawers',        w: 0.70 },
    { id: '02', type: 'dishwasher', label: 'Slim dishwasher, integrated', w: 0.45 },
    { id: '03', type: 'sink',       label: 'Undermount sink, single bowl', w: 0.80 },
    { id: '04', type: 'hob',        label: 'Induction hob + drawers',     w: 0.60 },
    { id: '05', type: 'counter',    label: 'Landing zone / buffer',       w: 0.25 },
    { id: '06', type: 'fridge',     label: 'Fridge column, full height',  w: 0.60 },
  ],
}
export const KITCHEN_RUN = KITCHEN.units.reduce((s, u) => s + u.w, 0)  // 3.20m

// ── Dining table ──────────────────────────────────────────────────
// Square 4-top in the open zone between the stairs, kitchen and entrance.
export const DINING = {
  cx: 4.70, cy: 5.90,   // center (plan coords) — pulled toward stud S1
  w: 0.90, d: 0.90,     // table top size
  seats: 4,
  chair: 0.45,          // chair footprint (square)
  chairGap: 0.06,       // gap between table edge and chair
}

// ── Couch ─────────────────────────────────────────────────────────
// 210 × 84 cm (0.85m tall) in the living strip, facing the south glass
// gable. Long axis E–W; backrest on the north side.
export const COUCH = {
  cx: 1.65, cy: 6.42,   // center (plan coords) — moved south, faces the TV
  w: 2.10,              // width (along x)
  d: 0.84,              // depth (along y)
  h: 0.85,              // height (3D)
  facing: 'north',      // seat opens toward -y (toward the TV wall)
}

// ── TV / media unit ───────────────────────────────────────────────
// At the north end of the living strip (west of the stairs, clear of
// the bathroom door). Console with a wall-style panel above, facing south.
export const TV = {
  cx: 1.50,            // center x
  consoleY: 3.65,      // console center y (north end of living strip)
  consoleW: 1.60, consoleD: 0.40, consoleH: 0.50,
  panelW: 1.40, panelH: 0.80, panelSill: 0.65,  // TV panel above the console
}

// ── Tie beams ─────────────────────────────────────────────────────
// 20×20cm beams sitting on top of the studs, running front-to-back.
// B1 spans the full depth over the x=1.20 studs (S2, S3); B2 spans from
// the inner step wall to the front over the single x=5.40 stud (S1).
export const BEAMS = [
  { id: 'B1', x: 1.20, size: 0.20, y1: 0,      y2: H_LEFT },
  { id: 'B2', x: 5.40, size: 0.20, y1: STEP_Y, y2: H_LEFT },
]

// ── Total floor area (m²) ─────────────────────────────────────────
export const FLOOR_AREA = W_TOP * H_LEFT + STEP_W * H_RIGHT
