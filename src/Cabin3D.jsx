import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, Line, Text } from '@react-three/drei'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import {
  W_TOP, H_LEFT, W_BOTTOM, H_RIGHT, STEP_Y,
  WALL_HEIGHT, WALL_THICK,
  ROOM_POLYGON, WALL_SEGMENTS,
  ENTRANCE, TERRACE_DOOR, BATHROOM_DOOR, RIGHT_WINDOW, TOP_WINDOW,
  STUD_SIZE, STUDS, FLOOR_AREA,
  STAIR, STAIR_X1, STAIR_X2, STAIR_Y1, STAIR_Y2,
} from './cabinData.js'
import Kitchen3D from './Kitchen3D'
import { kitchenUnitRects } from './Kitchen.jsx'
import DiningTable3D from './DiningTable3D'
import Couch3D from './Couch3D'
import { DINING, COUCH } from './cabinData.js'

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
    glass: true, cols: 4, transom: 0.18,
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

// Footprints (plan rects [x1, y1, x2, y2]) the figure may not overlap.
function blockedRects() {
  const rects = kitchenUnitRects().map(r => [r.x1m, r.y1m, r.x2m, r.y2m])
  rects.push([STAIR_X1, STAIR_Y1, STAIR_X2, STAIR_Y2])
  for (const s of STUDS)
    rects.push([s.cx - STUD_SIZE / 2, s.cy - STUD_SIZE / 2, s.cx + STUD_SIZE / 2, s.cy + STUD_SIZE / 2])
  rects.push([DINING.cx - DINING.w / 2, DINING.cy - DINING.d / 2,
              DINING.cx + DINING.w / 2, DINING.cy + DINING.d / 2])
  rects.push([COUCH.cx - COUCH.w / 2, COUCH.cy - COUCH.d / 2,
              COUCH.cx + COUCH.w / 2, COUCH.cy + COUCH.d / 2])
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
function Wall({ from, to, height, openings, out = [0, 0] }) {
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
        <meshStandardMaterial color="#efe7d4" roughness={0.85} side={THREE.DoubleSide}
                              transparent opacity={0.4} depthWrite={false} />
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

// ── A-frame roof: LEFT slope only, 62°, eave at floor level ────────
const ROOF_PITCH    = 62 * Math.PI / 180
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

function Studs() {
  return STUDS.map(s => {
    const [wx, wz] = toWorld([s.cx, s.cy])
    return (
      <mesh key={s.id} position={[wx, WALL_HEIGHT / 2, wz]} castShadow receiveShadow>
        <boxGeometry args={[STUD_SIZE, WALL_HEIGHT, STUD_SIZE]} />
        <meshStandardMaterial color="#6b5744" roughness={0.85} />
      </mesh>
    )
  })
}

// ── Dimension annotations on the floor plane ──────────────────────
// Each entry: edge endpoints in plan coords + an outward offset (plan)
// and the length label. Drawn flat on the floor so it reads from above.
const DIMS = [
  { p: [0, 0],        q: [0, H_LEFT],        off: [-0.55, 0],  label: '8.20' },
  { p: [0, H_LEFT],   q: [W_BOTTOM, H_LEFT], off: [0, 0.55],   label: '6.60' },
  { p: [0, 0],        q: [W_TOP, 0],         off: [0, -0.55],  label: '3.30' },
  { p: [W_BOTTOM, STEP_Y], q: [W_BOTTOM, H_LEFT], off: [0.55, 0], label: '4.80' },
  { p: [W_TOP, 0],    q: [W_TOP, STEP_Y],    off: [0.45, 0],   label: '3.40' },
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

// Clear distance between the kitchen counter front and stud S1
function KitchenStudGap() {
  const s1 = STUDS.find(s => s.id === 'S1')
  if (!s1) return null
  const rects = kitchenUnitRects()
  const cabinetFrontX = Math.min(...rects.map(r => r.x1m))  // room-facing edge
  const studX = s1.cx                                       // stud centerline (matches 2D dim)
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

export default function Cabin3D() {
  const [showDims, setShowDims] = useState(true)
  const [showRoof, setShowRoof] = useState(true)
  const [personAt, setPersonAt] = useState([1.6, 6.3])
  const cx = W_BOTTOM / 2
  const cy = H_LEFT / 2

  // World intersection point → plan coords (undo the centering group offset).
  // group is at [-cx, 0, -cy]; inside it world = offset + (planX, 0, planY).
  const handlePick = (point) => {
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
          {WALL_SEGMENTS.map(seg => (
            <Wall key={seg.id} from={seg.from} to={seg.to} height={WALL_HEIGHT}
                  out={seg.out}
                  openings={OPENINGS.filter(o => o.wall === seg.id)} />
          ))}
          <Studs />
          <Staircase />
          <Kitchen3D />
          <DiningTable3D />
          <Couch3D />
          {showRoof && <Roof />}
          <Person at={personAt} />
          {showDims && <Dimensions />}
          {showDims && <KitchenStudGap />}
        </group>

        <Grid args={[30, 30]} cellColor="#3a4050" sectionColor="#2a3040"
              position={[0, -0.11, 0]} fadeDistance={28} infiniteGrid />
        <OrbitControls makeDefault target={[0, 1, 0]} />
      </Canvas>
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
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
      <div style={{
        position: 'absolute', bottom: 24, left: 24,
        color: '#cbd5e1', fontFamily: 'system-ui, sans-serif', fontSize: 12,
        background: 'rgba(0,0,0,0.4)', padding: '6px 10px', borderRadius: 6,
        backdropFilter: 'blur(8px)',
      }}>
        Drag to orbit · Scroll to zoom · Click the floor to move the figure  ·  Area ≈ {FLOOR_AREA.toFixed(1)} m²
      </div>
    </div>
  )
}
