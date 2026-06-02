import { COUCH } from './cabinData.js'

const SEAT_H = 0.42
const ARM_H  = 0.58
const ARM_W  = 0.16
const BACK_T = 0.18
const FABRIC    = '#8d9bb0'
const FABRIC_DK = '#7d8ba2'

// Standalone — render inside Cabin3D's centered group (plan coords = world).
// Backrest sits on the side opposite `facing`; seat opens toward `facing`.
export default function Couch3D() {
  const { cx, cy, w, d, h, facing } = COUCH
  const innerW = w - 2 * ARM_W
  const backSign = facing === 'south' ? -1 : 1   // y-side of the backrest
  const backZ = cy + backSign * (d / 2 - BACK_T / 2)
  const seatZ = cy - backSign * (BACK_T / 2)
  return (
    <group>
      {/* seat base */}
      <mesh position={[cx, SEAT_H / 2, seatZ]} castShadow receiveShadow>
        <boxGeometry args={[innerW, SEAT_H, d - BACK_T]} />
        <meshStandardMaterial color={FABRIC} roughness={0.9} />
      </mesh>
      {/* backrest */}
      <mesh position={[cx, h / 2, backZ]} castShadow>
        <boxGeometry args={[w, h, BACK_T]} />
        <meshStandardMaterial color={FABRIC_DK} roughness={0.9} />
      </mesh>
      {/* armrests (west / east) */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[cx + s * (w / 2 - ARM_W / 2), ARM_H / 2, cy]} castShadow>
          <boxGeometry args={[ARM_W, ARM_H, d]} />
          <meshStandardMaterial color={FABRIC_DK} roughness={0.9} />
        </mesh>
      ))}
      {/* seat cushions */}
      {[-1, 0, 1].map(i => (
        <mesh key={i} position={[cx + i * (innerW / 3), SEAT_H + 0.06, seatZ]} castShadow>
          <boxGeometry args={[innerW / 3 - 0.03, 0.12, d - BACK_T - 0.04]} />
          <meshStandardMaterial color={FABRIC} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}
