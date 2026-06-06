import { BAR } from './cabinData.js'
import { barStoolCenters } from './Bar.jsx'

const WOOD    = '#8a5a36'   // rustic walnut top + slats
const WOOD_DK = '#5f3f27'   // pedestal core
const BRASS   = '#b9913f'   // gold accent slats
const METAL   = '#2a2a2a'   // black stool frame
const SEAT    = '#9c6b3f'   // stool seat

// Slatted pedestal leg: solid core with proud vertical slats (a couple
// in brass) on the front and back faces, matching the reference.
function SlatPedestal({ cx, y, w, height, depth }) {
  const n = 7
  const pitch = w / n
  const slatW = pitch * 0.62
  const items = [
    <mesh key="core" position={[cx, height / 2, y]} castShadow receiveShadow>
      <boxGeometry args={[w, height, depth]} />
      <meshStandardMaterial color={WOOD_DK} roughness={0.75} />
    </mesh>,
  ]
  for (let i = 0; i < n; i++) {
    const sx = cx - w / 2 + (i + 0.5) * pitch
    const brass = i === 1 || i === 5
    const col = brass ? BRASS : WOOD
    for (const f of [1, -1]) {
      items.push(
        <mesh key={`${i}_${f}`} position={[sx, height / 2, y + f * (depth / 2 + 0.008)]} castShadow>
          <boxGeometry args={[slatW, height * 0.96, 0.016]} />
          <meshStandardMaterial color={col} roughness={brass ? 0.4 : 0.7} metalness={brass ? 0.6 : 0} />
        </mesh>
      )
    }
  }
  return <group>{items}</group>
}

// Round bar stool: wood seat, four splayed black-metal legs, foot ring.
function Stool({ x, y, r, h }) {
  const legH = h - 0.04
  return (
    <group position={[x, 0, y]}>
      <mesh position={[0, h, 0]} castShadow>
        <cylinderGeometry args={[r, r, 0.04, 24]} />
        <meshStandardMaterial color={SEAT} roughness={0.6} />
      </mesh>
      {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * r * 0.5, legH / 2, sz * r * 0.5]}
              rotation={[sz * 0.13, 0, -sx * 0.13]}>
          <cylinderGeometry args={[0.012, 0.012, legH, 8]} />
          <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.9, 0.012, 8, 24]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

// Standalone — render inside Cabin3D's centered group (plan coords = world).
export default function Bar3D() {
  const { cx, cy, w, d, h, top, stoolR, stoolH } = BAR
  const pedT = 0.28
  const legH = h - top
  return (
    <group>
      {/* thick top slab */}
      <mesh position={[cx, h - top / 2, cy]} castShadow receiveShadow>
        <boxGeometry args={[w, top, d]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} />
      </mesh>
      {/* slatted end pedestals */}
      <SlatPedestal cx={cx} y={cy - (d / 2 - pedT / 2)} w={w} height={legH} depth={pedT} />
      <SlatPedestal cx={cx} y={cy + (d / 2 - pedT / 2)} w={w} height={legH} depth={pedT} />
      {/* bar stools (two per long side) */}
      {barStoolCenters().map((s, i) => <Stool key={i} x={s.x} y={s.y} r={stoolR} h={stoolH} />)}
    </group>
  )
}
