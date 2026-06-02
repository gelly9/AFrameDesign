import { DINING } from './cabinData.js'
import { diningChairCenters } from './DiningTable.jsx'

const TABLE_H = 0.74
const TOP_T   = 0.04
const LEG     = 0.06
const SEAT_H  = 0.45
const SEAT_T  = 0.04
const BACK_H  = 0.45
const WOOD    = '#b5895f'
const WOOD_DK = '#8c6741'
const CHAIR   = '#c9a87c'

function Chair({ at, faceX, faceY }) {
  const { chair } = DINING
  const s = chair * 0.8
  return (
    <group position={[at.x, 0, at.y]}>
      {/* seat */}
      <mesh position={[0, SEAT_H, 0]} castShadow>
        <boxGeometry args={[s, SEAT_T, s]} />
        <meshStandardMaterial color={CHAIR} roughness={0.8} />
      </mesh>
      {/* backrest on the side away from the table */}
      <mesh position={[faceX * s / 2, SEAT_H + BACK_H / 2, faceY * s / 2]} castShadow>
        <boxGeometry args={[faceX ? SEAT_T : s, BACK_H, faceY ? SEAT_T : s]} />
        <meshStandardMaterial color={CHAIR} roughness={0.8} />
      </mesh>
      {/* 4 legs */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * s * 0.4, SEAT_H / 2, sz * s * 0.4]}>
          <boxGeometry args={[0.04, SEAT_H, 0.04]} />
          <meshStandardMaterial color={CHAIR} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

// Standalone — render inside Cabin3D's centered group (plan coords = world).
export default function DiningTable3D() {
  const { cx, cy, w, d } = DINING
  const chairs = diningChairCenters()
  // unit vector from each chair toward the table (to orient backrests)
  return (
    <group>
      {/* top */}
      <mesh position={[cx, TABLE_H - TOP_T / 2, cy]} castShadow receiveShadow>
        <boxGeometry args={[w, TOP_T, d]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      {/* legs */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[cx + sx * (w / 2 - LEG), (TABLE_H - TOP_T) / 2, cy + sz * (d / 2 - LEG)]} castShadow>
          <boxGeometry args={[LEG, TABLE_H - TOP_T, LEG]} />
          <meshStandardMaterial color={WOOD_DK} roughness={0.75} />
        </mesh>
      ))}
      {/* chairs (backrest faces away from table center) */}
      {chairs.map((c, i) => {
        const dx = c.x - cx, dy = c.y - cy
        const faceX = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0
        const faceY = Math.abs(dy) >= Math.abs(dx) ? Math.sign(dy) : 0
        return <Chair key={i} at={c} faceX={faceX} faceY={faceY} />
      })}
    </group>
  )
}
