import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, Line, Text } from '@react-three/drei'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import {
  W_TOP, H_LEFT, W_BOTTOM, H_RIGHT, STEP_Y,
  WALL_HEIGHT,
  ROOM_POLYGON, WALL_SEGMENTS,
  ENTRANCE, TERRACE_DOOR, BATHROOM_DOOR, RIGHT_WINDOW, TOP_WINDOW,
  STUD_SIZE, STUDS, FLOOR_AREA,
} from './cabinData.js'

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
  // Entrance — bottom wall
  {
    wall: 'bottom', kind: 'door',
    p: [ENTRANCE.fromLeft, H_LEFT],
    q: [ENTRANCE.fromLeft + ENTRANCE.width, H_LEFT],
    sill: 0, h: ENTRANCE.height,
  },
  // Terrace door — right wall, starts at top of right wall (STEP_Y)
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

// ── Extruded L-shape floor ────────────────────────────────────────
function Floor() {
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
    <mesh geometry={geom} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <meshStandardMaterial color="#d6c8a8" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

const THICK = 0.12

// ── One vertical wall, with openings projected onto it ────────────
function Wall({ from, to, height, openings }) {
  const A = from, B = to
  const dx = B[0] - A[0]
  const dy = B[1] - A[1]
  const L  = Math.hypot(dx, dy)

  // local X axis of the box must align with the plan direction A→B.
  // After a Y-rotation by θ, local +X → world (cosθ, 0, -sinθ).
  // Wall world direction is (dx, 0, dy)/L  ⇒  θ = atan2(-dy, dx).
  const angle = Math.atan2(-dy, dx)

  const [mwx, mwz] = toWorld([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2])

  // Unit vector along the wall in plan space, for projecting openings.
  const ux = dx / L, uy = dy / L

  return (
    <group position={[mwx, height / 2, mwz]} rotation={[0, angle, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[L, height, THICK]} />
        <meshStandardMaterial color="#efe7d4" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {openings.map((op, i) => {
        const cx = (op.p[0] + op.q[0]) / 2
        const cy = (op.p[1] + op.q[1]) / 2
        // distance of opening center from A along the wall
        const d = (cx - A[0]) * ux + (cy - A[1]) * uy
        const w = Math.hypot(op.q[0] - op.p[0], op.q[1] - op.p[1])
        const localX = d - L / 2
        const localY = op.sill + op.h / 2 - height / 2
        return (
          <mesh key={i} position={[localX, localY, 0]}>
            <boxGeometry args={[w, op.h, THICK + 0.04]} />
            <meshStandardMaterial
              color={op.kind === 'door' ? '#4a3925' : '#9ad0e8'}
              metalness={op.kind === 'window' ? 0.3 : 0}
              roughness={op.kind === 'window' ? 0.2 : 0.7}
              transparent={op.kind === 'window'}
              opacity={op.kind === 'window' ? 0.55 : 1}
            />
          </mesh>
        )
      })}
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

export default function Cabin3D() {
  const [showDims, setShowDims] = useState(true)
  const cx = W_BOTTOM / 2
  const cy = H_LEFT / 2

  return (
    <div style={{ width: '100%', height: '85vh', background: '#1a1f2a', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
      <Canvas shadows camera={{ position: [9, 9, 11], fov: 42 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 5]} intensity={1.2} castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <Environment preset="sunset" />

        {/* Center the model on the world origin */}
        <group position={[-cx, 0, -cy]}>
          <Floor />
          {WALL_SEGMENTS.map(seg => (
            <Wall key={seg.id} from={seg.from} to={seg.to} height={WALL_HEIGHT}
                  openings={OPENINGS.filter(o => o.wall === seg.id)} />
          ))}
          <Studs />
          {showDims && <Dimensions />}
        </group>

        <Grid args={[30, 30]} cellColor="#3a4050" sectionColor="#2a3040"
              position={[0, -0.11, 0]} fadeDistance={28} infiniteGrid />
        <OrbitControls makeDefault target={[0, 1, 0]} />
      </Canvas>
      <button
        onClick={() => setShowDims(d => !d)}
        style={{
          position: 'absolute', top: 16, right: 16,
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
      <div style={{
        position: 'absolute', bottom: 24, left: 24,
        color: '#cbd5e1', fontFamily: 'system-ui, sans-serif', fontSize: 12,
        background: 'rgba(0,0,0,0.4)', padding: '6px 10px', borderRadius: 6,
        backdropFilter: 'blur(8px)',
      }}>
        Drag to orbit · Scroll to zoom · Right-drag to pan  ·  Area ≈ {FLOOR_AREA.toFixed(1)} m²
      </div>
    </div>
  )
}
