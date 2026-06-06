import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, Grid, Environment, Line, Text } from '@react-three/drei'
import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import {
  W_TOP, H_LEFT, W_BOTTOM, H_RIGHT, STEP_Y,
  WALL_HEIGHT, WALL_THICK,
  ROOM_POLYGON, WALL_SEGMENTS,
  ENTRANCE, TERRACE_DOOR, BATHROOM_DOOR, RIGHT_WINDOW, TOP_WINDOW,
  STUD_SIZE, STUD_HEIGHT, STUDS, FLOOR_AREA,
  STAIR, STAIR_X1, STAIR_X2, STAIR_Y1, STAIR_Y2,
  BEAMS, JOIST,
} from './cabinData.js'
import Kitchen3D from './Kitchen3D'
import { kitchenUnitRects } from './Kitchen.jsx'
import DiningTable3D from './DiningTable3D'   // kept for later; bar is used instead
import Bar3D from './Bar3D'
import Couch3D from './Couch3D'
import Tv3D from './Tv3D'
import { DINING, BAR, COUCH, ARMCHAIR, TV, KITCHEN_RUN } from './cabinData.js'

// ── Coordinate convention ─────────────────────────────────────────
// Plan coords are (x, y) with y increasing downward (south).
// World coords map: worldX = planX, worldZ = planY, worldY = up.
// (A straight identity on z keeps the same handedness as the 2D plan,
//  so the model reads the same way round as the floor plan.)
const toWorld = ([x, y]) => [x, y]

// ── Openings, defined by ABSOLUTE plan-coordinate endpoints ───────
// These are computed the exact same way the 2D floor plan computes them,
// so the two views can never drift apart.
const OPENINGS = [
  // Entrance — bottom wall: A-frame glass facade, 4 panels + transom row
  {
    wall: 'bottom', kind: 'door',
    p: [ENTRANCE.fromLeft, H_LEFT],
    q: [ENTRANCE.fromLeft + ENTRANCE.width, H_LEFT],
    sill: 0, h: ENTRANCE.height,
    glass: ENTRANCE.glass, cols: ENTRANCE.cols, transom: ENTRANCE.transom,
  },
  // Terrace door — right wall, 0.25m below the inner step wall (STEP_Y + fromTop)
  {
    wall: 'right', kind: 'door',
    p: [W_BOTTOM, STEP_Y + TERRACE_DOOR.fromTop],
    q: [W_BOTTOM, STEP_Y + TERRACE_DOOR.fromTop + TERRACE_DOOR.width],
    sill: 0, h: TERRACE_DOOR.height,
  },
  // Right window — right wall, measured from bottom
  {
    wall: 'right', kind: 'window',
    p: [W_BOTTOM, H_LEFT - RIGHT_WINDOW.fromBottom - RIGHT_WINDOW.width],
    q: [W_BOTTOM, H_LEFT - RIGHT_WINDOW.fromBottom],
    sill: RIGHT_WINDOW.sillHeight, h: RIGHT_WINDOW.height,
  },
  // Top window — top wall, measured from right end (x = W_TOP)
  {
    wall: 'top', kind: 'window',
    p: [W_TOP - TOP_WINDOW.fromRight - TOP_WINDOW.width, 0],
    q: [W_TOP - TOP_WINDOW.fromRight, 0],
    sill: TOP_WINDOW.sillHeight, h: TOP_WINDOW.height,
  },
  // Bathroom door — inner vertical wall (x = W_TOP), from bottom of that wall
  {
    wall: 'innerVert', kind: 'door',
    p: [W_TOP, STEP_Y - BATHROOM_DOOR.fromBottom - BATHROOM_DOOR.width],
    q: [W_TOP, STEP_Y - BATHROOM_DOOR.fromBottom],
    sill: 0, h: BATHROOM_DOOR.height,
  },
]

// Point-in-polygon test (plan coords) for constraining placement
function insideRoom(x, y) {
  let inside = false
  for (let i = 0, j = ROOM_POLYGON.length - 1; i < ROOM_POLYGON.length; j = i++) {
    const [xi, yi] = ROOM_POLYGON[i]
    const [xj, yj] = ROOM_POLYGON[j]
    const hit = (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (hit) inside = !inside
  }
  return inside
}

// Clearance kept around the figure when placing it (≈ its standing
// footprint radius; 0.50m shoulder width fits the 0.525m cabinet↔stud gap).
const PERSON_R = 0.25

// Inside the room AND at least BODY_R clear of every wall (so the
// walk-through camera can't clip through walls).
const BODY_R = 0.30
function insideRoomClear(x, y) {
  return insideRoom(x, y) &&
    insideRoom(x + BODY_R, y) && insideRoom(x - BODY_R, y) &&
    insideRoom(x, y + BODY_R) && insideRoom(x, y - BODY_R)
}

// Footprints (plan rects [x1, y1, x2, y2]) the figure may not overlap.
function blockedRects() {
  const rects = kitchenUnitRects().map(r => [r.x1m, r.y1m, r.x2m, r.y2m])
  rects.push([STAIR_X1, STAIR_Y1, STAIR_X2, STAIR_Y2])
  for (const s of STUDS)
    rects.push([s.cx - STUD_SIZE / 2, s.cy - STUD_SIZE / 2, s.cx + STUD_SIZE / 2, s.cy + STUD_SIZE / 2])
  rects.push([BAR.cx - BAR.w / 2, BAR.cy - BAR.d / 2,
              BAR.cx + BAR.w / 2, BAR.cy + BAR.d / 2])
  // Orientation-aware footprints. Diagonal facings use a conservative
  // square bounding box; axis-aligned swap extents for east/west.
  const foot = (cx, cy, along, depth, facing) => {
    if (facing && facing.length > 5) {            // 'southwest', 'northeast', …
      const h = (along + depth) * Math.SQRT1_2 / 2
      return [cx - h, cy - h, cx + h, cy + h]
    }
    const ew = facing === 'east' || facing === 'west'
    const xH = ew ? depth / 2 : along / 2
    const yH = ew ? along / 2 : depth / 2
    return [cx - xH, cy - yH, cx + xH, cy + yH]
  }
  rects.push(foot(COUCH.cx, COUCH.cy, COUCH.w, COUCH.d, COUCH.facing))
  rects.push(foot(ARMCHAIR.cx, ARMCHAIR.cy, ARMCHAIR.w, ARMCHAIR.d, ARMCHAIR.facing))
  rects.push(foot(TV.cx, TV.cy, TV.consoleW, TV.consoleD, TV.facing))
  return rects
}

// True if a circle of radius PERSON_R at (x, y) overlaps any item footprint.
function hitsItem(x, y) {
  for (const [x1, y1, x2, y2] of blockedRects()) {
    const nx = Math.max(x1, Math.min(x, x2))   // nearest point on rect
    const ny = Math.max(y1, Math.min(y, y2))
    const dx = x - nx, dy = y - ny
    if (dx * dx + dy * dy < PERSON_R * PERSON_R) return true
  }
  return false
}

// ── Extruded L-shape floor ────────────────────────────────────────
function Floor({ onPick }) {
  const geom = useMemo(() => {
    const s = new THREE.Shape()
    ROOM_POLYGON.forEach(([x, y], i) => {
      if (i === 0) s.moveTo(x, y)
      else         s.lineTo(x, y)
    })
    s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: 0.10, bevelEnabled: false })
  }, [])
  // +PI/2 about X maps shape (x, y_plan) → world (x, 0, +y_plan).
  return (
    <mesh geometry={geom} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow
          onClick={(e) => { e.stopPropagation(); onPick && onPick(e.point) }}>
      <meshStandardMaterial color="#d6c8a8" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

const THICK = WALL_THICK   // 0.20m, built outward from the interior line

// ── A single door/window, optionally glass with mullions + transom ──
function Opening({ op, w, cx, cy }) {
  const h = op.h
  const isGlass = op.glass || op.kind === 'window'
  const cols = op.cols || (op.panes ? op.panes[0] : 1)
  const rows = op.panes ? op.panes[1] : 1
  const barT  = 0.06               // mullion thickness
  const depth = THICK + 0.05
  const frameColor = '#241a10'

  const bars = []
  const top = cy + h / 2

  // outer frame ring
  bars.push(
    <mesh key="ft" position={[cx, top - barT / 2, 0]}><boxGeometry args={[w, barT, depth + 0.01]} /><meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>,
    <mesh key="fb" position={[cx, cy - h / 2 + barT / 2, 0]}><boxGeometry args={[w, barT, depth + 0.01]} /><meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>,
    <mesh key="fl" position={[cx - w / 2 + barT / 2, cy, 0]}><boxGeometry args={[barT, h, depth + 0.01]} /><meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>,
    <mesh key="fr" position={[cx + w / 2 - barT / 2, cy, 0]}><boxGeometry args={[barT, h, depth + 0.01]} /><meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>,
  )

  // vertical mullions between columns
  for (let j = 1; j < cols; j++) {
    const lx = cx - w / 2 + (j * w) / cols
    bars.push(
      <mesh key={`v${j}`} position={[lx, cy, 0]}>
        <boxGeometry args={[barT, h, depth + 0.01]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
    )
  }

  // transom: a single horizontal bar near the top
  if (op.transom) {
    const ly = top - op.transom * h
    bars.push(
      <mesh key="transom" position={[cx, ly, 0]}>
        <boxGeometry args={[w, barT, depth + 0.01]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
    )
  }

  // even horizontal mullions (when panes specify rows)
  for (let k = 1; k < rows; k++) {
    const ly = cy - h / 2 + (k * h) / rows
    bars.push(
      <mesh key={`h${k}`} position={[cx, ly, 0]}>
        <boxGeometry args={[w, barT, depth + 0.01]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>
    )
  }

  return (
    <group>
      <mesh position={[cx, cy, 0]}>
        <boxGeometry args={[w, h, depth]} />
        <meshStandardMaterial
          color={isGlass ? '#2e3a44' : '#4a3925'}
          metalness={isGlass ? 0.5 : 0}
          roughness={isGlass ? 0.08 : 0.7}
          transparent={isGlass}
          opacity={isGlass ? 0.45 : 1}
          depthWrite={!isGlass}
        />
      </mesh>
      {bars}
    </group>
  )
}

// ── One vertical wall, with openings projected onto it ────────────
function Wall({ from, to, height, openings, out = [0, 0], opacity = 0.4 }) {
  const A = from, B = to
  const dx = B[0] - A[0]
  const dy = B[1] - A[1]
  const L  = Math.hypot(dx, dy)

  // local X axis of the box must align with the plan direction A→B.
  // After a Y-rotation by θ, local +X → world (cosθ, 0, -sinθ).
  // Wall world direction is (dx, 0, dy)/L  ⇒  θ = atan2(-dy, dx).
  const angle = Math.atan2(-dy, dx)

  // Offset the wall OUTWARD by half its thickness so its inner face
  // sits exactly on the interior dimension line. Extend the length by
  // THICK so neighbours overlap and corners close cleanly.
  const midX = (A[0] + B[0]) / 2 + out[0] * (THICK / 2)
  const midY = (A[1] + B[1]) / 2 + out[1] * (THICK / 2)
  const [mwx, mwz] = toWorld([midX, midY])

  // Unit vector along the wall in plan space, for projecting openings.
  const ux = dx / L, uy = dy / L

  return (
    <group position={[mwx, height / 2, mwz]} rotation={[0, angle, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[L + THICK, height, THICK]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} side={THREE.DoubleSide}
                              transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
      </mesh>
      {openings.map((op, i) => {
        const cx = (op.p[0] + op.q[0]) / 2
        const cy = (op.p[1] + op.q[1]) / 2
        // distance of opening center from A along the wall
        const d = (cx - A[0]) * ux + (cy - A[1]) * uy
        const w = Math.hypot(op.q[0] - op.p[0], op.q[1] - op.p[1])
        const localX = d - L / 2
        const localY = op.sill + op.h / 2 - height / 2
        return <Opening key={i} op={op} w={w} cx={localX} cy={localY} />
      })}
    </group>
  )
}

// ── A-frame roof: LEFT slope only, 64°, eave at floor level ────────
const ROOF_PITCH    = 64 * Math.PI / 180
const ROOF_OVERHANG = 0.40   // eave begins 40cm outside the wall line

function RoofPlane({ ax, ah, bx, bh, lenZ, zMid }) {
  const w = Math.hypot(bx - ax, bh - ah)
  const ang = Math.atan2(bh - ah, bx - ax)
  return (
    <mesh position={[(ax + bx) / 2, (ah + bh) / 2, zMid]} rotation={[0, 0, ang]}>
      <boxGeometry args={[w, 0.10, lenZ]} />
      <meshStandardMaterial color="#9ec8e0" transparent opacity={0.16}
                            roughness={0.1} metalness={0.2}
                            side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

function Roof() {
  const ridgeX = W_TOP                                          // ridge over the inner step
  const footX  = -ROOF_OVERHANG                                 // eave 20cm outside the wall
  const ridgeH = (ridgeX - footX) * Math.tan(ROOF_PITCH)        // from floor (height 0)
  const lenZ = H_LEFT
  const zMid = H_LEFT / 2
  return (
    <group>
      {/* left slope: eave at floor level (20cm outside the wall) → ridge, at 60° */}
      <RoofPlane ax={footX} ah={0} bx={ridgeX} bh={ridgeH} lenZ={lenZ} zMid={zMid} />
    </group>
  )
}

// Roof height above a given plan x (Infinity where there is no roof).
function roofHeightAt(x) {
  const footX = -ROOF_OVERHANG
  if (x < footX || x > W_TOP) return Infinity
  return (x - footX) * Math.tan(ROOF_PITCH)
}

// A wall running along x at plan-y = wy, with its TOP clipped to the
// roof slope so it never pokes above the roof. Built as an extruded
// profile (floor → min(wall height, roof height)).
function ClippedXWall({ x1, x2, wy, outward, opacity = 0.4 }) {
  const xa = Math.min(x1, x2) - WALL_THICK / 2
  const xb = Math.max(x1, x2) + WALL_THICK / 2
  const topAt = x => Math.min(WALL_HEIGHT, roofHeightAt(x))
  const xCross = -ROOF_OVERHANG + WALL_HEIGHT / Math.tan(ROOF_PITCH)  // roof == wall height
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(xa, 0)
    s.lineTo(xb, 0)
    s.lineTo(xb, topAt(xb))
    if (xCross > xa && xCross < xb) s.lineTo(xCross, WALL_HEIGHT)
    s.lineTo(xa, topAt(xa))
    s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: WALL_THICK, bevelEnabled: false })
  }, [xa, xb, xCross])
  const z = outward < 0 ? wy - WALL_THICK : wy   // sit outside the interior line
  return (
    <mesh geometry={geo} position={[0, 0, z]} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.9} side={THREE.DoubleSide}
                            transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
    </mesh>
  )
}

// Opening on an x-running wall, placed by absolute plan coordinates.
function AbsOpening({ op }) {
  if (!op) return null
  const cx = (op.p[0] + op.q[0]) / 2
  const wy = (op.p[1] + op.q[1]) / 2
  const w = Math.hypot(op.q[0] - op.p[0], op.q[1] - op.p[1])
  return (
    <group position={[cx, op.sill + op.h / 2, wy]}>
      <Opening op={op} w={w} cx={0} cy={0} />
    </group>
  )
}

// ── Staircase: steel mono-stringer with floating oak treads ───────
// Open underneath (usable space below). Starts low at the right (door)
// and rises toward the left.
function Staircase() {
  const nSteps  = Math.round(STAIR.run / STAIR.treadDepth)
  const rise    = WALL_HEIGHT / nSteps
  const zMid    = (STAIR_Y1 + STAIR_Y2) / 2
  const TREAD_T = 0.05
  const OVERHANG = 0.05
  const STEEL = '#34383d'
  const OAK   = '#c9a26a'

  // Central inclined steel spine: bottom-right (floor) → top-left (wall height)
  const x1 = STAIR_X2, x2 = STAIR_X1
  const len = Math.hypot(x2 - x1, WALL_HEIGHT)
  const ang = Math.atan2(WALL_HEIGHT, x2 - x1)

  const parts = []
  for (let i = 0; i < nSteps; i++) {
    const h = (nSteps - i) * rise                       // tread top height
    const xC = STAIR_X1 + (i + 0.5) * STAIR.treadDepth
    // oak tread
    parts.push(
      <mesh key={`t${i}`} position={[xC, h - TREAD_T / 2, zMid]} castShadow receiveShadow>
        <boxGeometry args={[STAIR.treadDepth + OVERHANG, TREAD_T, STAIR.width]} />
        <meshStandardMaterial color={OAK} roughness={0.6} />
      </mesh>
    )
    // steel bracket joining spine to tread
    parts.push(
      <mesh key={`b${i}`} position={[xC, h - TREAD_T - 0.1, zMid]} castShadow>
        <boxGeometry args={[0.14, 0.20, 0.16]} />
        <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.4} />
      </mesh>
    )
  }

  return (
    <group>
      {/* steel spine */}
      <mesh position={[(x1 + x2) / 2, WALL_HEIGHT / 2, zMid]} rotation={[0, 0, ang]} castShadow>
        <boxGeometry args={[len, 0.20, 0.16]} />
        <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.4} />
      </mesh>
      {parts}
    </group>
  )
}

// ── 1.80m human figure for scale ──────────────────────────────────
function Person({ at }) {
  const [wx, wz] = toWorld(at)
  const skin = '#caa07a'
  const cloth = '#3f5d73'
  return (
    <group position={[wx, 0, wz]}>
      {/* legs */}
      <mesh position={[-0.10, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.74, 4, 8]} />
        <meshStandardMaterial color={cloth} roughness={0.8} />
      </mesh>
      <mesh position={[0.10, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.74, 4, 8]} />
        <meshStandardMaterial color={cloth} roughness={0.8} />
      </mesh>
      {/* torso */}
      <mesh position={[0, 1.18, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.42, 4, 8]} />
        <meshStandardMaterial color={cloth} roughness={0.8} />
      </mesh>
      {/* arms */}
      <mesh position={[-0.22, 1.18, 0]} rotation={[0, 0, 0.12]} castShadow>
        <capsuleGeometry args={[0.05, 0.52, 4, 8]} />
        <meshStandardMaterial color={cloth} roughness={0.8} />
      </mesh>
      <mesh position={[0.22, 1.18, 0]} rotation={[0, 0, -0.12]} castShadow>
        <capsuleGeometry args={[0.05, 0.52, 4, 8]} />
        <meshStandardMaterial color={cloth} roughness={0.8} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.66, 0]} castShadow>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
    </group>
  )
}

// A rustic hand-hewn timber stud: axe-chamfered corners and uneven
// incised notch grooves cut around a weathered, knotty post.
function CarvedStud({ x, z }) {
  const H = STUD_HEIGHT, S = STUD_SIZE, half = S / 2
  const WOOD = '#5a4632', EDGE = '#6e553c', GROOVE = '#332619'
  // shaved (chamfered) facets running up the four corners
  const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz], i) => (
    <mesh key={`c${i}`} position={[x + sx * (half - 0.006), H / 2, z + sz * (half - 0.006)]}
          rotation={[0, Math.PI / 4, 0]} castShadow>
      <boxGeometry args={[0.05, H, 0.02]} />
      <meshStandardMaterial color={EDGE} roughness={0.95} />
    </mesh>
  ))
  // hand-cut notch grooves at uneven heights and depths
  const grooves = [
    [0.21, 0.03], [0.57, 0.02], [0.96, 0.038], [1.32, 0.022],
    [1.71, 0.032], [2.06, 0.02], [2.33, 0.034],
  ].map(([gy, t], i) => (
    <mesh key={`g${i}`} position={[x, gy, z]} castShadow>
      <boxGeometry args={[S + 0.005, t, S + 0.005]} />
      <meshStandardMaterial color={GROOVE} roughness={1} />
    </mesh>
  ))
  return (
    <group>
      <mesh position={[x, H / 2, z]} castShadow receiveShadow>
        <boxGeometry args={[S, H, S]} />
        <meshStandardMaterial color={WOOD} roughness={0.95} />
      </mesh>
      {corners}
      {grooves}
    </group>
  )
}

function Studs() {
  return STUDS.map(s => {
    const [wx, wz] = toWorld([s.cx, s.cy])
    return <CarvedStud key={s.id} x={wx} z={wz} />
  })
}

// 20×20cm tie beams sitting on top of the studs, running front-to-back.
function TieBeams() {
  return BEAMS.map(b => (
    <mesh key={b.id} position={[b.x, STUD_HEIGHT + b.height / 2, (b.y1 + b.y2) / 2]} castShadow receiveShadow>
      <boxGeometry args={[b.width, b.height, b.y2 - b.y1]} />
      <meshStandardMaterial color="#d8b787" roughness={0.75} />
    </mesh>
  ))
}

// Joist y-positions: from the front wall back to the stair (the stairwell
// is left open — no joists over it), spaced JOIST.spacing.
function joistYs() {
  const b2 = BEAMS.find(b => b.id === 'B2')
  const y0 = b2.y2 - JOIST.width / 2          // first joist flush with the front wall
  const stop = STAIR_Y2 + JOIST.width / 2     // last joist clears the stair's south edge
  const ys = []
  for (let y = y0; y >= stop - 1e-6; y -= JOIST.spacing) ys.push(y)
  return ys
}

// Cross joists resting on top of beams B1 & B2, spanning x between them.
function CrossJoists() {
  const b1 = BEAMS.find(b => b.id === 'B1')
  const b2 = BEAMS.find(b => b.id === 'B2')
  const xMid = (b1.x + b2.x) / 2
  const len  = Math.abs(b2.x - b1.x) + JOIST.width          // span across, onto the beams
  const notch = 0.05                                        // notched 5cm into the beams
  const cY   = STUD_HEIGHT + b1.height - notch + JOIST.height / 2
  return (
    <group>
      {joistYs().map((y, i) => (
        <mesh key={i} position={[xMid, cY, y]} castShadow receiveShadow>
          <boxGeometry args={[len, JOIST.height, JOIST.width]} />
          <meshStandardMaterial color="#c2a878" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// Drywall ceiling between the joists, recessed so the bottom 10cm of
// each joist stays exposed.
function DrywallCeiling() {
  const b1 = BEAMS.find(b => b.id === 'B1')
  const b2 = BEAMS.find(b => b.id === 'B2')
  const x1 = b1.x - JOIST.width / 2, x2 = b2.x + JOIST.width / 2   // out to the joist ends
  const xMid = (x1 + x2) / 2, len = x2 - x1
  const notch = 0.05
  const joistBottom = STUD_HEIGHT + b1.height - notch        // 2.58
  const reveal = 0.10                                        // wood visible below the drywall
  const thick = 0.025
  const cy = joistBottom + reveal + thick / 2
  const ys = joistYs()
  const panels = []
  for (let i = 0; i < ys.length - 1; i++) {
    const a = ys[i] - JOIST.width / 2
    const b = ys[i + 1] + JOIST.width / 2
    panels.push(
      <mesh key={i} position={[xMid, cy, (a + b) / 2]} receiveShadow>
        <boxGeometry args={[len, thick, a - b]} />
        <meshStandardMaterial color="#e9e7e1" roughness={0.95} />
      </mesh>
    )
  }
  // end panel: from the last joist out to the start of the stairwell
  const lastEdge = ys[ys.length - 1] - JOIST.width / 2
  if (lastEdge > STAIR_Y2) {
    panels.push(
      <mesh key="stairend" position={[xMid, cy, (lastEdge + STAIR_Y2) / 2]} receiveShadow>
        <boxGeometry args={[len, thick, lastEdge - STAIR_Y2]} />
        <meshStandardMaterial color="#e9e7e1" roughness={0.95} />
      </mesh>
    )
  }
  return <group>{panels}</group>
}

// Bathroom joist y-positions (upper area, shifted 10cm back).
function bathroomJoistYs() {
  const ys = []
  for (let y = STEP_Y - JOIST.width / 2 - 0.10; y >= JOIST.width / 2 - 1e-6; y -= JOIST.spacing) ys.push(y)
  return ys
}

// Joists over the bathroom (upper area): span from beam B1 to the
// bathroom wall (inner vertical wall at x = W_TOP), one edge on the wall.
function BathroomJoists() {
  const b1 = BEAMS.find(b => b.id === 'B1')
  const xMid = (b1.x + W_TOP) / 2
  const len  = (W_TOP - b1.x) + JOIST.width           // onto B1 + sit on the wall
  const notch = 0.05
  const cY = STUD_HEIGHT + b1.height - notch + JOIST.height / 2
  return (
    <group>
      {bathroomJoistYs().map((y, i) => (
        <mesh key={i} position={[xMid, cY, y]} castShadow receiveShadow>
          <boxGeometry args={[len, JOIST.height, JOIST.width]} />
          <meshStandardMaterial color="#c2a878" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// Drywall between the bathroom joists (recessed 10cm like the main ceiling).
function BathroomDrywall() {
  const b1 = BEAMS.find(b => b.id === 'B1')
  const x1 = b1.x - JOIST.width / 2, x2 = W_TOP       // joist west end → bathroom wall
  const xMid = (x1 + x2) / 2, len = x2 - x1
  const joistBottom = STUD_HEIGHT + b1.height - 0.05
  const thick = 0.025
  const cy = joistBottom + 0.10 + thick / 2
  const ys = bathroomJoistYs()
  const panels = ys.slice(0, -1).map((y, i) => {
    const a = y - JOIST.width / 2
    const b = ys[i + 1] + JOIST.width / 2
    return { c: (a + b) / 2, w: a - b }
  })
  // end panel: from the last joist out to the back (top) wall
  const last = ys[ys.length - 1] - JOIST.width / 2
  panels.push({ c: last / 2, w: last })
  return (
    <group>
      {panels.map((p, i) => (
        <mesh key={i} position={[xMid, cy, p.c]} receiveShadow>
          <boxGeometry args={[len, thick, p.w]} />
          <meshStandardMaterial color="#e9e7e1" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

// Flat drywall closing the gaps the joisted ceilings don't reach (between
// the bathroom & main ceilings, and out to the right wall over the kitchen)
// — leaves only the actual stair opening bare.
function StairLinkDrywall() {
  const b1 = BEAMS.find(b => b.id === 'B1')
  const b2 = BEAMS.find(b => b.id === 'B2')
  const xW = b1.x - JOIST.width / 2                    // joist west end (1.20)
  const xE = b2.x + JOIST.width / 2                    // joist east end (5.40)
  const thick = 0.025
  const joistBottom = STUD_HEIGHT + b1.height - 0.05   // 2.58
  const cyRecess = joistBottom + 0.10 + thick / 2      // flush with the recessed drywall
  const cyFlush  = joistBottom + thick / 2             // flush with the joist undersides
  const bathSouth = bathroomJoistYs()[0] - JOIST.width / 2   // south edge of bathroom ceiling
  const panel = (x1, x2, y1, y2, cy, key) => (
    <mesh key={key} position={[(x1 + x2) / 2, cy, (y1 + y2) / 2]} receiveShadow>
      <boxGeometry args={[x2 - x1, thick, y2 - y1]} />
      <meshStandardMaterial color="#e9e7e1" roughness={0.95} />
    </mesh>
  )
  return (
    <group>
      {panel(xW, STAIR_X1, STAIR_Y1, STAIR_Y2, cyRecess, 'west')}        {/* alongside the stairwell */}
      {panel(xW, W_TOP, bathSouth, STEP_Y, cyRecess, 'step')}             {/* bathroom → inner step */}
      {panel(xE, W_BOTTOM, STAIR_Y2, H_LEFT, cyFlush, 'east')}           {/* B2 → right wall (kitchen) */}
    </group>
  )
}

// A single recessed downlight: warm spot aimed straight down, with a
// dark housing ring and a glowing lens set into the soffit. The emitter
// follows `on`; the visible fixture follows `showFixtures` (roof toggle).
function CeilingSpot({ x, z, h, on, showFixtures }) {
  const target = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(x, 0, z)
    return o
  }, [x, z])
  return (
    <group>
      {on && (
        <>
          <primitive object={target} />
          <spotLight position={[x, h, z]} target={target}
            angle={0.6} penumbra={0.6} intensity={18} distance={6} decay={2}
            color="#ffe6c0" />
        </>
      )}
      {showFixtures && (
        <>
          <mesh position={[x, h + 0.01, z]}>
            <cylinderGeometry args={[0.065, 0.065, 0.03, 20]} />
            <meshStandardMaterial color="#1c1c1c" roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[x, h - 0.008, z]}>
            <cylinderGeometry args={[0.05, 0.05, 0.006, 20]} />
            <meshStandardMaterial color="#fff3e0" emissive="#ffdca0"
              emissiveIntensity={on ? 3 : 0} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  )
}

// Four downlights recessed into the kitchen soffit, evenly along the run.
function KitchenSpots({ on, showFixtures }) {
  // flush with the soffit (gipszkarton) underside, not hanging below it
  const joistBottom = STUD_HEIGHT + BEAMS.find(b => b.id === 'B1').height - 0.05
  const h = joistBottom + 0.008
  const x = 5.95                                   // over the counter, 30cm toward the joists
  const ys = [0, 1, 2, 3].map(i => H_LEFT - (i + 0.5) * (KITCHEN_RUN / 4))
  return (
    <group>
      {ys.map((z, i) => <CeilingSpot key={i} x={x} z={z} h={h} on={on} showFixtures={showFixtures} />)}
    </group>
  )
}

// Interactive light switch on the right wall by the fridge — click to toggle.
function LightSwitch({ pos, on, onToggle }) {
  const [hover, setHover] = useState(false)
  return (
    <group position={pos}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto' }}>
      {/* face plate (front faces -y, into the room) */}
      <mesh castShadow>
        <boxGeometry args={[0.085, 0.13, 0.02]} />
        <meshStandardMaterial color={hover ? '#e8edf2' : '#f2f2f0'} roughness={0.5} />
      </mesh>
      {/* rocker — tilts and glows when on */}
      <mesh position={[0, on ? 0.018 : -0.018, -0.013]} rotation={[on ? -0.18 : 0.18, 0, 0]}>
        <boxGeometry args={[0.05, 0.06, 0.014]} />
        <meshStandardMaterial color={on ? '#fff7e0' : '#cdd1d6'}
          emissive={on ? '#ffcf5a' : '#000000'} emissiveIntensity={on ? 0.5 : 0} />
      </mesh>
    </group>
  )
}

// Modern single cone pendant over the dining table — matte-black shade on
// a thin rod, warm bulb at the opening. Light follows the `on` flag.
function Chandelier({ on }) {
  const cx = BAR.cx, cy = BAR.cy
  const canopyY = 2.53
  const coneH = 0.24, coneR = 0.16
  const coneBottom = 1.72
  const coneY = coneBottom + coneH / 2
  const apexY = coneY + coneH / 2
  const rodTop = canopyY - 0.02, rodBottom = apexY
  const rodMid = (rodTop + rodBottom) / 2, rodLen = rodTop - rodBottom
  const BLACK = '#1f1f1f'
  return (
    <group>
      {/* ceiling canopy */}
      <mesh position={[cx, canopyY, cy]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 24]} />
        <meshStandardMaterial color={BLACK} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* rod */}
      <mesh position={[cx, rodMid, cy]}>
        <cylinderGeometry args={[0.006, 0.006, rodLen, 8]} />
        <meshStandardMaterial color={BLACK} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* cone shade (open at the wide bottom) */}
      <mesh position={[cx, coneY, cy]} castShadow>
        <coneGeometry args={[coneR, coneH, 32, 1, true]} />
        <meshStandardMaterial color={BLACK} roughness={0.45} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* warm bulb at the opening */}
      <mesh position={[cx, coneBottom + 0.05, cy]}>
        <sphereGeometry args={[0.05, 20, 20]} />
        <meshStandardMaterial color="#fff4dc"
          emissive={on ? '#ffd98a' : '#3a3a3a'} emissiveIntensity={on ? 2 : 0} toneMapped={false} />
      </mesh>
      {on && <pointLight position={[cx, coneBottom, cy]} intensity={6} distance={5} decay={2} color="#ffe6b8" />}
    </group>
  )
}

// ── Dimension annotations on the floor plane ──────────────────────
// Each entry: edge endpoints in plan coords + an outward offset (plan)
// and the length label. Drawn flat on the floor so it reads from above.
const DIMS = [
  { p: [0, 0],        q: [0, H_LEFT],        off: [-0.55, 0],  label: '8.10' },
  { p: [0, H_LEFT],   q: [W_BOTTOM, H_LEFT], off: [0, 0.55],   label: '6.60' },
  { p: [0, 0],        q: [W_TOP, 0],         off: [0, -0.55],  label: '3.30' },
  { p: [W_BOTTOM, STEP_Y], q: [W_BOTTOM, H_LEFT], off: [0.55, 0], label: '5.00' },
  { p: [W_TOP, 0],    q: [W_TOP, STEP_Y],    off: [0.45, 0],   label: '3.10' },
  { p: [W_TOP, STEP_Y], q: [W_BOTTOM, STEP_Y], off: [0, -0.45], label: '3.30' },
]

function Dim({ p, q, off, label }) {
  const y = 0.04
  const a = [p[0] + off[0], y, p[1] + off[1]]
  const b = [q[0] + off[0], y, q[1] + off[1]]
  const mid = [(a[0] + b[0]) / 2, y + 0.01, (a[2] + b[2]) / 2]
  // small ticks at each end
  const tick = 0.12
  const isVert = Math.abs(q[1] - p[1]) > Math.abs(q[0] - p[0])
  const tA = isVert
    ? [[a[0] - tick, y, a[2]], [a[0] + tick, y, a[2]]]
    : [[a[0], y, a[2] - tick], [a[0], y, a[2] + tick]]
  const tB = isVert
    ? [[b[0] - tick, y, b[2]], [b[0] + tick, y, b[2]]]
    : [[b[0], y, b[2] - tick], [b[0], y, b[2] + tick]]
  return (
    <group>
      <Line points={[a, b]} color="#e2b84a" lineWidth={1.5} />
      <Line points={tA} color="#e2b84a" lineWidth={1.5} />
      <Line points={tB} color="#e2b84a" lineWidth={1.5} />
      <Text position={mid} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.28}
            color="#f0d480" anchorX="center" anchorY="middle"
            outlineWidth={0.012} outlineColor="#1a1f2a">
        {label}
      </Text>
    </group>
  )
}

function Dimensions() {
  return DIMS.map((d, i) => <Dim key={i} {...d} />)
}

// Stud placement dims: distance from the left wall (S2 & S3), the
// distance from the front (bottom) wall for S3 and S1, and the spacing
// between S2 and S3.
function StudWallDims() {
  const s2 = STUDS.find(s => s.id === 'S2')
  const s3 = STUDS.find(s => s.id === 'S3')
  return (
    <group>
      {STUDS.map(s => {
        const offY = s.cy < H_LEFT / 2 ? -0.40 : 0.40
        const items = []
        if (s.id === 'S2' || s.id === 'S3') {
          const faceL = s.cx - STUD_SIZE / 2   // near face toward the left wall
          items.push(<Dim key="L" p={[0, s.cy]} q={[faceL, s.cy]} off={[0, offY]} label={faceL.toFixed(2)} />)
        }
        if (s.id === 'S3' || s.id === 'S1') {
          const offX = s.id === 'S1' ? -0.30 : 0.30
          items.push(<Dim key="F" p={[s.cx, s.cy]} q={[s.cx, H_LEFT]} off={[offX, 0]} label={(H_LEFT - s.cy).toFixed(2)} />)
        }
        if (s.id === 'S2') {
          // distance to the back (top) wall
          items.push(<Dim key="B" p={[s.cx, 0]} q={[s.cx, s.cy]} off={[0.30, 0]} label={s.cy.toFixed(2)} />)
        }
        return items.length ? <group key={s.id}>{items}</group> : null
      })}
      {/* spacing between S2 and S3 (same x line) */}
      {s2 && s3 && (
        <Dim p={[s2.cx, s2.cy]} q={[s3.cx, s3.cy]} off={[-0.40, 0]} label={(s3.cy - s2.cy).toFixed(2)} />
      )}
    </group>
  )
}

// Clear distance between the kitchen counter front and stud S1
function KitchenStudGap() {
  const s1 = STUDS.find(s => s.id === 'S1')
  if (!s1) return null
  const rects = kitchenUnitRects()
  const cabinetFrontX = Math.min(...rects.map(r => r.x1m))  // room-facing edge
  const studX = s1.cx + STUD_SIZE / 2                       // stud face toward the counter
  const z = s1.cy
  const y = 0.06
  const a = [studX, y, z]
  const b = [cabinetFrontX, y, z]
  const mid = [(studX + cabinetFrontX) / 2, y + 0.01, z]
  const dist = cabinetFrontX - studX
  const tick = 0.10
  const col = '#4ec9b0'
  return (
    <group>
      <Line points={[a, b]} color={col} lineWidth={2} />
      <Line points={[[a[0], y, z - tick], [a[0], y, z + tick]]} color={col} lineWidth={2} />
      <Line points={[[b[0], y, z - tick], [b[0], y, z + tick]]} color={col} lineWidth={2} />
      <Text position={mid} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.24}
            color="#7fe9d6" anchorX="center" anchorY="middle"
            outlineWidth={0.012} outlineColor="#1a1f2a">
        {dist.toFixed(2)} m
      </Text>
    </group>
  )
}

// ── Orbit (dollhouse) camera: damping + zoom/pan guardrails ──────────
function OrbitCam({ cx, cy }) {
  const { camera } = useThree()
  const ref = useRef()
  useEffect(() => {
    camera.position.set(9, 9, 11)        // reset to the default framing on (re)enter
    camera.updateProjectionMatrix()
  }, [camera])
  const clamp = () => {
    const c = ref.current
    if (!c) return
    // keep the orbit target within the house footprint so it can't drift off
    c.target.x = Math.max(-cx, Math.min(cx, c.target.x))
    c.target.z = Math.max(-cy, Math.min(cy, c.target.z))
    c.target.y = Math.max(0, Math.min(WALL_HEIGHT, c.target.y))
  }
  return (
    <OrbitControls ref={ref} makeDefault target={[0, 1, 0]} onChange={clamp}
      enableDamping dampingFactor={0.08}
      minDistance={2.5} maxDistance={22}
      maxPolarAngle={Math.PI / 2 - 0.05} />
  )
}

// True if (x,y) is on the staircase footprint.
function onStair(x, y) {
  return x >= STAIR_X1 && x <= STAIR_X2 && y >= STAIR_Y1 && y <= STAIR_Y2
}

// Floor height under the walk camera: 0 on the slab, rising along the stair
// ramp (low at the right/terrace end → WALL_HEIGHT at the top-left).
function groundHeight(x, y) {
  if (!onStair(x, y)) return 0
  const t = (STAIR_X2 - x) / STAIR.run        // 0 at the bottom → 1 at the top
  return Math.max(0, Math.min(WALL_HEIGHT, t * WALL_HEIGHT))
}

// Walk collision: inside the walls and clear of furniture (a camera is a
// point, so a smaller margin than the standing figure feels better). The
// staircase is intentionally walkable, so its footprint is skipped.
function walkClear(x, y) {
  if (!insideRoomClear(x, y)) return false
  for (const [x1, y1, x2, y2] of blockedRects()) {
    if (x1 === STAIR_X1 && y1 === STAIR_Y1 && x2 === STAIR_X2 && y2 === STAIR_Y2) continue
    const nx = Math.max(x1, Math.min(x, x2))
    const ny = Math.max(y1, Math.min(y, y2))
    const dx = x - nx, dy = y - ny
    if (dx * dx + dy * dy < 0.18 * 0.18) return false
  }
  return true
}

const WORLD_UP = new THREE.Vector3(0, 1, 0)

// Light switch placement (plan coords: x, mount height, y) — a two-gang
// plate on the front wall, between the main entrance and the fridge.
const SWITCH_DINING  = [5.50, 1.20, 8.08]   // left gang → dining pendant
const SWITCH_KITCHEN = [5.62, 1.20, 8.08]   // right gang → kitchen spots

// ── First-person walk-through ─────────────────────────────────────
// Desktop: mouse-look (pointer lock) + W/S walk, A/D turn.
// Touch: drag to look, on-screen buttons drive the same input ref.
function WalkControls({ cx, cy, switches, inputRef, isTouch }) {
  const { camera, gl } = useThree()
  const EYE = 1.65
  const SPEED = 2.4   // m/s
  const TURN = 1.8    // rad/s
  const yaw = useRef(0), pitch = useRef(0)
  const applyLook = () =>
    camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))

  useEffect(() => {
    for (const k in inputRef.current) inputRef.current[k] = false   // clear stale held keys
    // start in the open lane between couch and dining, looking into the room
    camera.position.set(4.0 - cx, EYE, 7.3 - cy)
    if (isTouch) { yaw.current = 0; pitch.current = 0; applyLook() }
    else camera.lookAt(4.0 - cx, EYE, 4.8 - cy)
    const down = e => { inputRef.current[e.code] = true }
    const up   = e => { inputRef.current[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [camera, cx, cy, isTouch, inputRef])

  // Touch: one-finger drag rotates the view (yaw + clamped pitch).
  useEffect(() => {
    if (!isTouch) return
    const el = gl.domElement
    let lx = 0, ly = 0, active = false
    const start = e => { const t = e.touches[0]; lx = t.clientX; ly = t.clientY; active = true }
    const move = e => {
      if (!active) return
      const t = e.touches[0]
      yaw.current   -= (t.clientX - lx) * 0.005
      pitch.current  = Math.max(-1.2, Math.min(1.2, pitch.current - (t.clientY - ly) * 0.005))
      lx = t.clientX; ly = t.clientY
      applyLook()
      e.preventDefault()
    }
    const end = () => { active = false }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
  }, [isTouch, camera, gl])

  // Desktop: while the pointer is locked, a click "uses" the aimed switch.
  // (On touch, tapping the switch mesh triggers its own onClick instead.)
  useEffect(() => {
    const onClick = () => {
      if (!document.pointerLockElement) return
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      let best = null, bestDot = 0.9
      for (const s of switches) {
        const toSw = new THREE.Vector3(s.pos[0] - cx, s.pos[1], s.pos[2] - cy).sub(camera.position)
        if (toSw.length() < 2.6) {
          const d = dir.dot(toSw.normalize())
          if (d > bestDot) { bestDot = d; best = s }
        }
      }
      if (best) best.toggle()
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [camera, cx, cy, switches])

  useFrame((_, delta) => {
    const k = inputRef.current
    let f = 0, t = 0
    if (k.KeyW || k.ArrowUp)    f += 1
    if (k.KeyS || k.ArrowDown)  f -= 1
    if (k.KeyA || k.ArrowLeft)  t += 1   // turn left
    if (k.KeyD || k.ArrowRight) t -= 1   // turn right
    if (t) {
      if (isTouch) { yaw.current += t * TURN * delta; applyLook() }
      else camera.rotateOnWorldAxis(WORLD_UP, t * TURN * delta)
    }
    if (f) {
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      dir.y = 0
      if (dir.lengthSq() > 0) {
        dir.normalize().multiplyScalar(f * SPEED * delta)
        const step = (dx, dz) => {
          const nx = camera.position.x + dx, nz = camera.position.z + dz
          if (walkClear(nx + cx, nz + cy)) {
            camera.position.x = nx; camera.position.z = nz; return true
          }
          return false
        }
        if (!step(dir.x, dir.z)) { step(dir.x, 0); step(0, dir.z) }
      }
    }
    // ride the stair ramp (or stay at eye height on the flat slab)
    camera.position.y = groundHeight(camera.position.x + cx, camera.position.z + cy) + EYE
  })

  return isTouch ? null : <PointerLockControls />
}

// Press-and-hold button that drives a key flag in the shared walk input.
function HoldButton({ code, inputRef, label }) {
  const set = v => e => { e.preventDefault(); inputRef.current[code] = v }
  return (
    <button
      onPointerDown={set(true)} onPointerUp={set(false)}
      onPointerLeave={set(false)} onPointerCancel={set(false)}
      onContextMenu={e => e.preventDefault()}
      style={{
        width: 56, height: 56, borderRadius: 12, fontSize: 22, fontWeight: 700,
        color: '#1a1f2a', background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(0,0,0,0.15)', touchAction: 'none', userSelect: 'none',
        WebkitUserSelect: 'none', backdropFilter: 'blur(6px)',
      }}
    >{label}</button>
  )
}

export default function Cabin3D() {
  const [showDims, setShowDims] = useState(true)
  const [showRoof, setShowRoof] = useState(false)
  const [walk, setWalk] = useState(false)
  const [lightsOn, setLightsOn] = useState(true)
  const [diningOn, setDiningOn] = useState(true)
  const toggleLights = useCallback(() => setLightsOn(v => !v), [])
  const toggleDining = useCallback(() => setDiningOn(v => !v), [])
  const switches = useMemo(() => [
    { pos: SWITCH_KITCHEN, toggle: toggleLights },
    { pos: SWITCH_DINING,  toggle: toggleDining },
  ], [toggleLights, toggleDining])
  const [personAt, setPersonAt] = useState([1.6, 6.3])
  const walkInput = useRef({})
  const isTouch = useMemo(() => typeof window !== 'undefined' &&
    (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window), [])
  const cx = W_BOTTOM / 2
  const cy = H_LEFT / 2
  const wallOpacity = walk ? 1 : 0.4    // solid from inside, see-through in the overview

  // Walking inside always shows the roof; showing the roof turns the lights on.
  useEffect(() => { if (walk) setShowRoof(true) }, [walk])
  useEffect(() => { if (showRoof) { setLightsOn(true); setDiningOn(true) } }, [showRoof])

  // World intersection point → plan coords (undo the centering group offset).
  // group is at [-cx, 0, -cy]; inside it world = offset + (planX, 0, planY).
  const handlePick = (point) => {
    if (walk) return                       // in walk mode a click locks the pointer
    const planX = point.x + cx
    const planY = point.z + cy
    if (insideRoom(planX, planY) && !hitsItem(planX, planY)) setPersonAt([planX, planY])
  }

  return (
    <div style={{ width: '100%', height: '85vh', background: '#1a1f2a', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
      <Canvas shadows camera={{ position: [9, 9, 11], fov: 42 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 5]} intensity={1.2} castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <Environment preset="sunset" />

        {/* Center the model on the world origin */}
        <group position={[-cx, 0, -cy]}>
          <Floor onPick={handlePick} />
          {/* top & bottom walls: tops clipped to the roof slope */}
          <ClippedXWall x1={0} x2={W_TOP}    wy={0}      outward={-1} opacity={wallOpacity} />
          <ClippedXWall x1={0} x2={W_BOTTOM} wy={H_LEFT} outward={1} opacity={wallOpacity} />
          <AbsOpening op={OPENINGS.find(o => o.wall === 'top')} />
          <AbsOpening op={OPENINGS.find(o => o.wall === 'bottom')} />
          {/* remaining vertical walls (not under the slope) stay full height */}
          {WALL_SEGMENTS.filter(s => s.id !== 'top' && s.id !== 'bottom').map(seg => (
            <Wall key={seg.id} from={seg.from} to={seg.to} height={WALL_HEIGHT}
                  out={seg.out} opacity={wallOpacity}
                  openings={OPENINGS.filter(o => o.wall === seg.id)} />
          ))}
          <Studs />
          <TieBeams />
          {showRoof && <CrossJoists />}
          {showRoof && <BathroomJoists />}
          {showRoof && <DrywallCeiling />}
          {showRoof && <BathroomDrywall />}
          {showRoof && <KitchenSpots on={lightsOn} showFixtures />}
          <LightSwitch pos={SWITCH_KITCHEN} on={lightsOn} onToggle={toggleLights} />
          <LightSwitch pos={SWITCH_DINING} on={diningOn} onToggle={toggleDining} />
          {showRoof && <StairLinkDrywall />}
          <Staircase />
          <Kitchen3D />
          {/* <DiningTable3D /> — swapped for the bar; keep for later */}
          <Bar3D />
          {showRoof && <Chandelier on={diningOn} />}
          <Couch3D />
          <Couch3D data={ARMCHAIR} />
          <Tv3D />
          {showRoof && <Roof />}
          {!walk && <Person at={personAt} />}
          {showDims && <Dimensions />}
          {showDims && <StudWallDims />}
          {showDims && <KitchenStudGap />}
        </group>

        <Grid args={[30, 30]} cellColor="#3a4050" sectionColor="#2a3040"
              position={[0, -0.11, 0]} fadeDistance={28} infiniteGrid />
        {walk
          ? <WalkControls cx={cx} cy={cy} switches={switches} inputRef={walkInput} isTouch={isTouch} />
          : <OrbitCam cx={cx} cy={cy} />}
      </Canvas>
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setWalk(w => !w)}
          style={{
            padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.15)',
            background: walk ? '#86c98a' : 'rgba(0,0,0,0.45)',
            color: walk ? '#1a1f2a' : '#cbd5e1',
            fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}
        >
          {walk ? 'Exit walk' : 'Walk inside'}
        </button>
        <button
          onClick={() => setShowRoof(r => !r)}
          style={{
            padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.15)',
            background: showRoof ? '#9ec8e0' : 'rgba(0,0,0,0.45)',
            color: showRoof ? '#1a1f2a' : '#cbd5e1',
            fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}
        >
          {showRoof ? 'Hide roof' : 'Show roof'}
        </button>
        <button
          onClick={() => setShowDims(d => !d)}
          style={{
            padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.15)',
            background: showDims ? '#e2b84a' : 'rgba(0,0,0,0.45)',
            color: showDims ? '#1a1f2a' : '#cbd5e1',
            fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}
        >
          {showDims ? 'Hide dimensions' : 'Show dimensions'}
        </button>
      </div>
      {walk && !isTouch && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 7, height: 7,
          marginLeft: -3.5, marginTop: -3.5, borderRadius: '50%',
          background: 'rgba(255,255,255,0.75)', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }} />
      )}
      {walk && isTouch && (
        <>
          {/* turn buttons (bottom-left) */}
          <div style={{ position: 'absolute', bottom: 22, left: 18, display: 'flex', gap: 10 }}>
            <HoldButton code="KeyA" inputRef={walkInput} label="‹" />
            <HoldButton code="KeyD" inputRef={walkInput} label="›" />
          </div>
          {/* walk buttons (bottom-right) */}
          <div style={{ position: 'absolute', bottom: 22, right: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <HoldButton code="KeyW" inputRef={walkInput} label="▲" />
            <HoldButton code="KeyS" inputRef={walkInput} label="▼" />
          </div>
        </>
      )}
      <div style={{
        position: 'absolute', bottom: 24, left: 24,
        color: '#cbd5e1', fontFamily: 'system-ui, sans-serif', fontSize: 12,
        background: 'rgba(0,0,0,0.4)', padding: '6px 10px', borderRadius: 6,
        backdropFilter: 'blur(8px)',
      }}>
        {walk
          ? (isTouch
              ? 'Drag to look around · ▲▼ to walk · ‹› to turn · tap a switch to use it'
              : 'W / S walk · A / D turn · click for mouse-look · aim at a switch & click to use · Esc to release')
          : 'Drag to orbit · Scroll to zoom · Click the floor to move the figure'}
        {'  ·  Area ≈ '}{FLOOR_AREA.toFixed(1)} m²
      </div>
    </div>
  )
}
