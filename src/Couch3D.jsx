import { COUCH } from './cabinData.js'

const SEAT_H = 0.42
const ARM_H  = 0.58
const ARM_W  = 0.16
const BACK_T = 0.18
const FABRIC    = '#8d9bb0'
const FABRIC_DK = '#7d8ba2'

// facing → rotation about Y of the canonical (faces-south, +z) couch
const ROT_Y = { south: 0, west: -Math.PI / 2, north: Math.PI, east: Math.PI / 2 }

// Standalone — render inside Cabin3D's centered group (plan coords = world).
// Drawn canonically at the origin facing SOUTH (+z): backrest on -z (north),
// then positioned at (cx, cy) and rotated to face `facing`.
export default function Couch3D() {
  const { cx, cy, w, d, h, facing } = COUCH
  const innerW = w - 2 * ARM_W
  const backZ = -(d / 2 - BACK_T / 2)   // backrest on the north (-z) side
  const seatZ = BACK_T / 2
  return (
    <group position={[cx, 0, cy]} rotation={[0, ROT_Y[facing] ?? 0, 0]}>
      {/* seat base */}
      <mesh position={[0, SEAT_H / 2, seatZ]} castShadow receiveShadow>
        <boxGeometry args={[innerW, SEAT_H, d - BACK_T]} />
        <meshStandardMaterial color={FABRIC} roughness={0.9} />
      </mesh>
      {/* backrest */}
      <mesh position={[0, h / 2, backZ]} castShadow>
        <boxGeometry args={[w, h, BACK_T]} />
        <meshStandardMaterial color={FABRIC_DK} roughness={0.9} />
      </mesh>
      {/* armrests */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * (w / 2 - ARM_W / 2), ARM_H / 2, 0]} castShadow>
          <boxGeometry args={[ARM_W, ARM_H, d]} />
          <meshStandardMaterial color={FABRIC_DK} roughness={0.9} />
        </mesh>
      ))}
      {/* seat cushions */}
      {[-1, 0, 1].map(i => (
        <mesh key={i} position={[i * (innerW / 3), SEAT_H + 0.06, seatZ]} castShadow>
          <boxGeometry args={[innerW / 3 - 0.03, 0.12, d - BACK_T - 0.04]} />
          <meshStandardMaterial color={FABRIC} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}
