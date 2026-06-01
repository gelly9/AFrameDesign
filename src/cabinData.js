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

// ── Wall segments (used by the 3D view to build vertical walls) ──
// The LEFT wall (8.20m) is intentionally omitted — it's the A-frame
// slope meeting the floor, not a vertical wall.
export const WALL_SEGMENTS = [
  { id: 'top',         from: [0,        0      ], to: [W_TOP,    0      ] },
  { id: 'innerVert',   from: [W_TOP,    0      ], to: [W_TOP,    STEP_Y ] },
  { id: 'innerHoriz',  from: [W_TOP,    STEP_Y ], to: [W_BOTTOM, STEP_Y ] },
  { id: 'right',       from: [W_BOTTOM, STEP_Y ], to: [W_BOTTOM, H_LEFT ] },
  { id: 'bottom',      from: [W_BOTTOM, H_LEFT ], to: [0,        H_LEFT ] },
]

// ── Entrance (bottom wall) ────────────────────────────────────────
export const ENTRANCE = {
  wall: 'bottom',
  fromLeft: 1.30,
  width:    3.80,
  height:   2.10,
}

// ── Terrace door (right wall, starts from top of that wall) ───────
export const TERRACE_DOOR = {
  wall: 'right',
  fromTop: 0,          // starts at top of right wall (STEP_Y)
  width:   1.05,
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

// ── Total floor area (m²) ─────────────────────────────────────────
export const FLOOR_AREA = W_TOP * H_LEFT + STEP_W * H_RIGHT
