import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'

// Bay between studs S2 and S3 (centered at origin for these concept views).
const BAY_W = 1.50   // post centre-to-centre
const BAY_H = 2.43   // stud height
const POST  = 0.15
const DEPTH = 0.32   // built-in depth (against the A-frame wall)
const INNER = BAY_W - POST   // clear width between post inner faces

const OAK     = '#c9a26a'
const OAK_DK  = '#8a6a3f'
const OLIVE   = '#7c8559'
const POSTC   = '#6b5744'
const BEAMC   = '#d8b787'
const Z0      = -DEPTH / 2     // built-in sits behind the posts

// ── Shared frame: the two posts + the beam on top + a floor ───────
function BayFrame() {
  return (
    <group>
      <mesh position={[0, -0.005, -0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.4, 1.1]} />
        <meshStandardMaterial color="#d6c8a8" roughness={0.95} />
      </mesh>
      {[-BAY_W / 2, BAY_W / 2].map((x, i) => (
        <mesh key={i} position={[x, BAY_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[POST, BAY_H, POST]} />
          <meshStandardMaterial color={POSTC} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, BAY_H + 0.10, 0]} castShadow>
        <boxGeometry args={[BAY_W + POST * 2, 0.20, POST]} />
        <meshStandardMaterial color={BEAMC} roughness={0.75} />
      </mesh>
    </group>
  )
}

function Board({ x = 0, y, z = Z0, w = INNER, h = 0.03, d = DEPTH, color = OAK }) {
  return (
    <mesh position={[x, y, z]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  )
}

// books: fixed (deterministic) rows of spines on a shelf
const BOOK_COLORS = ['#7a4b3a', '#3a5a4a', '#4a4a6a', '#8a7a3a', '#6a3a44', '#33524a', '#8a5a3a']
function Books({ y, count = 9, lean = false }) {
  const items = []
  let x = -INNER / 2 + 0.06
  for (let i = 0; i < count && x < INNER / 2 - 0.05; i++) {
    const w = 0.025 + ((i * 37) % 5) * 0.006
    const h = 0.20 + ((i * 53) % 6) * 0.018
    items.push(
      <mesh key={i} position={[x + w / 2, y + h / 2, Z0]} castShadow>
        <boxGeometry args={[w, h, DEPTH * 0.7]} />
        <meshStandardMaterial color={BOOK_COLORS[i % BOOK_COLORS.length]} roughness={0.8} />
      </mesh>
    )
    x += w + 0.006
  }
  return <group>{items}</group>
}

// ── 1. Built-in bookshelf ─────────────────────────────────────────
function Bookshelf() {
  const shelfY = [0.95, 1.42, 1.89, 2.36]
  return (
    <group>
      {/* base cabinet */}
      <mesh position={[0, 0.40, Z0]} castShadow receiveShadow>
        <boxGeometry args={[INNER, 0.80, DEPTH]} />
        <meshStandardMaterial color={OLIVE} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.40, Z0 + DEPTH / 2 + 0.002]}>
        <boxGeometry args={[0.012, 0.7, 0.01]} />
        <meshStandardMaterial color={OAK_DK} roughness={0.6} />
      </mesh>
      {/* side panels */}
      {[-INNER / 2, INNER / 2].map((x, i) => (
        <Board key={i} x={x} y={1.66} w={0.02} h={1.5} />
      ))}
      {/* shelves + books */}
      {shelfY.map((y, i) => <Board key={i} y={y} />)}
      <Books y={0.97} />
      <Books y={1.91} count={7} />
      {/* a plant on one shelf */}
      <mesh position={[INNER / 2 - 0.16, 1.49, Z0]} castShadow>
        <cylinderGeometry args={[0.05, 0.04, 0.10, 12]} />
        <meshStandardMaterial color="#9c6b43" roughness={0.8} />
      </mesh>
      <mesh position={[INNER / 2 - 0.16, 1.62, Z0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color="#4a6b46" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ── 2. Slatted timber screen ──────────────────────────────────────
function SlattedScreen() {
  const n = 11
  const slats = []
  for (let i = 0; i < n; i++) {
    const x = -INNER / 2 + (INNER / (n - 1)) * i
    slats.push(
      <mesh key={i} position={[x, BAY_H / 2 - 0.02, Z0]} castShadow>
        <boxGeometry args={[0.03, BAY_H - 0.08, 0.06]} />
        <meshStandardMaterial color={OAK} roughness={0.6} />
      </mesh>
    )
  }
  return <group>{slats}</group>
}

// ── 3. Firewood niche + bench ─────────────────────────────────────
function FirewoodBench() {
  const logs = []
  const rows = 3, cols = 6
  const r = 0.052
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const x = -INNER / 2 + 0.10 + c * (INNER - 0.20) / (cols - 1)
      const y = 0.07 + row * 0.105
      logs.push(
        <mesh key={`${row}-${c}`} position={[x, y, Z0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[r, r, DEPTH * 0.92, 12]} />
          <meshStandardMaterial color={row % 2 ? '#9b7b54' : '#86653f'} roughness={0.9} />
        </mesh>
      )
    }
  }
  return (
    <group>
      {logs}
      {/* bench seat above the firewood */}
      <mesh position={[0, 0.45, Z0]} castShadow receiveShadow>
        <boxGeometry args={[INNER, 0.07, DEPTH]} />
        <meshStandardMaterial color={OAK} roughness={0.6} />
      </mesh>
      {/* a cushion */}
      <mesh position={[0, 0.52, Z0]} castShadow>
        <boxGeometry args={[INNER * 0.9, 0.06, DEPTH * 0.8]} />
        <meshStandardMaterial color="#b8a98c" roughness={0.95} />
      </mesh>
      {/* display shelf above */}
      <Board y={1.65} />
      <Books y={1.67} count={6} />
    </group>
  )
}

// ── 4. Display niches (cubby grid) ────────────────────────────────
function DisplayNiches() {
  const cols = 3, rows = 4
  const y0 = 0.10, y1 = BAY_H - 0.05
  const boards = []
  // back panel
  boards.push(
    <mesh key="back" position={[0, (y0 + y1) / 2, Z0 - DEPTH / 2 + 0.01]}>
      <boxGeometry args={[INNER, y1 - y0, 0.02]} />
      <meshStandardMaterial color={OAK_DK} roughness={0.8} />
    </mesh>
  )
  for (let r = 0; r <= rows; r++) {
    const y = y0 + (y1 - y0) * r / rows
    boards.push(<Board key={`h${r}`} y={y} h={0.025} />)
  }
  for (let c = 0; c <= cols; c++) {
    const x = -INNER / 2 + INNER * c / cols
    boards.push(
      <mesh key={`v${c}`} position={[x, (y0 + y1) / 2, Z0]} castShadow>
        <boxGeometry args={[0.025, y1 - y0, DEPTH]} />
        <meshStandardMaterial color={OAK} roughness={0.6} />
      </mesh>
    )
  }
  return (
    <group>
      {boards}
      <Books y={y0 + 0.02} count={5} />
      {/* plant in a cubby */}
      <mesh position={[-INNER / 2 + INNER / 6, (y1 - y0) * 0.78, Z0]}>
        <sphereGeometry args={[0.10, 12, 12]} />
        <meshStandardMaterial color="#4a6b46" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ── 5. Hanging bench swing (hung from the beam) ───────────────────
function Swing() {
  const seatY = 0.52
  const ropeTop = BAY_H + 0.02          // just under the beam
  const sw = 1.00, sd = 0.48            // seat width / depth
  const ropeColor = '#b9a06a'
  const corners = [
    [-sw / 2 + 0.06, sd / 2 - 0.06], [sw / 2 - 0.06, sd / 2 - 0.06],
    [-sw / 2 + 0.06, -sd / 2 + 0.06], [sw / 2 - 0.06, -sd / 2 + 0.06],
  ]
  return (
    <group>
      {/* ropes from the beam to the four seat corners */}
      {corners.map(([x, z], i) => (
        <mesh key={i} position={[x, (ropeTop + seatY) / 2, z]}>
          <cylinderGeometry args={[0.012, 0.012, ropeTop - seatY, 8]} />
          <meshStandardMaterial color={ropeColor} roughness={0.9} />
        </mesh>
      ))}
      {/* seat */}
      <mesh position={[0, seatY, 0]} castShadow receiveShadow>
        <boxGeometry args={[sw, 0.09, sd]} />
        <meshStandardMaterial color={OAK} roughness={0.6} />
      </mesh>
      {/* cushion */}
      <mesh position={[0, seatY + 0.075, 0.03]} castShadow>
        <boxGeometry args={[sw * 0.92, 0.06, sd * 0.8]} />
        <meshStandardMaterial color="#b8a98c" roughness={0.95} />
      </mesh>
      {/* low backrest */}
      <mesh position={[0, seatY + 0.28, -sd / 2 + 0.03]} castShadow>
        <boxGeometry args={[sw, 0.46, 0.05]} />
        <meshStandardMaterial color={OAK} roughness={0.6} />
      </mesh>
      {/* a throw pillow */}
      <mesh position={[sw / 2 - 0.2, seatY + 0.18, -sd / 2 + 0.12]} rotation={[0.2, 0, 0.1]} castShadow>
        <boxGeometry args={[0.22, 0.22, 0.08]} />
        <meshStandardMaterial color="#7a8a6a" roughness={0.95} />
      </mesh>
    </group>
  )
}

const CONCEPTS = [
  { name: 'Hanging bench swing', Comp: Swing,
    desc: 'A cushioned oak bench swing hung from the beam between the posts — a relaxed perch facing the room.' },
  { name: 'Built-in bookshelf', Comp: Bookshelf,
    desc: 'Open oak shelves with a closed olive base cabinet, framed by the posts and beam. Storage + display.' },
  { name: 'Slatted timber screen', Comp: SlattedScreen,
    desc: 'Vertical oak slats — an airy partition that defines the living zone and softens the bathroom approach.' },
  { name: 'Firewood niche + bench', Comp: FirewoodBench,
    desc: 'A low oak bench with stacked firewood below (ends out) and a display shelf above. Cozy by the A-frame wall.' },
  { name: 'Display niches', Comp: DisplayNiches,
    desc: 'A grid of open cubbies for books, plants and objects against a warm back panel.' },
]

function ConceptCard({ name, desc, Comp }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', overflow: 'hidden' }}>
      <div style={{ height: 340, background: '#1a1f2a' }}>
        <Canvas shadows camera={{ position: [1.9, 1.5, 2.4], fov: 42 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 3]} intensity={1.1} castShadow
            shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
          <Environment preset="apartment" />
          <group position={[0, -1.15, 0.1]}>
            <BayFrame />
            <Comp />
          </group>
          <OrbitControls target={[0, 0.05, 0]} enablePan={false} minDistance={1.6} maxDistance={5} />
        </Canvas>
      </div>
      <div style={{ padding: '14px 18px', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#1a1a2e' }}>{name}</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.45 }}>{desc}</p>
      </div>
    </div>
  )
}

export default function BayConcepts() {
  return (
    <div style={{ padding: '2.5rem', background: '#eeeae4', minHeight: '100vh', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <h1 style={{ margin: '0 0 4px', color: '#1a1a2e' }}>S2–S3 Bay — Concepts</h1>
      <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 14 }}>
        Four ideas for the 1.50m bay between the studs (drag any view to rotate). Not added to the main model.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {CONCEPTS.map(c => <ConceptCard key={c.name} {...c} />)}
      </div>
    </div>
  )
}
