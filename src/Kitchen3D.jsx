import { kitchenUnitRects } from './Kitchen.jsx'

// Heights / palette (match the 2D olive scheme)
const COUNTER_H   = 0.90
const COUNTER_T   = 0.04
const FRIDGE_H    = 2.00
const OLIVE       = '#7c8559'
const OLIVE_DK    = '#4d5436'
const TOP         = '#cfcab8'
const HOB         = '#2b2b2b'
const STEEL       = '#b8bdba'

function roomSideX(r) {
  // x of the room-facing edge of the unit
  return r.wallSide === 'right' ? r.x1m : r.x2m
}

function Unit({ r }) {
  const { unit, x1m, x2m, y1m, y2m } = r
  const cx = (x1m + x2m) / 2
  const cz = (y1m + y2m) / 2
  const wx = x2m - x1m
  const wz = y2m - y1m

  if (unit.type === 'fridge') {
    const handleX = roomSideX(r) + (r.wallSide === 'right' ? 0.02 : -0.02)
    return (
      <group>
        <mesh position={[cx, FRIDGE_H / 2, cz]} castShadow receiveShadow>
          <boxGeometry args={[wx, FRIDGE_H, wz]} />
          <meshStandardMaterial color={OLIVE_DK} roughness={0.8} />
        </mesh>
        {/* door seam */}
        <mesh position={[handleX, FRIDGE_H * 0.55, cz]}>
          <boxGeometry args={[0.02, FRIDGE_H * 0.5, 0.03]} />
          <meshStandardMaterial color={OLIVE} roughness={0.6} />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      {/* carcass */}
      <mesh position={[cx, COUNTER_H / 2, cz]} castShadow receiveShadow>
        <boxGeometry args={[wx, COUNTER_H, wz]} />
        <meshStandardMaterial color={OLIVE} roughness={0.85} />
      </mesh>
      {/* countertop */}
      <mesh position={[cx, COUNTER_H + COUNTER_T / 2, cz]} castShadow>
        <boxGeometry args={[wx + 0.02, COUNTER_T, wz + 0.02]} />
        <meshStandardMaterial color={TOP} roughness={0.55} />
      </mesh>
      {/* appliance accents on the counter */}
      {unit.type === 'hob' && (
        <mesh position={[cx, COUNTER_H + COUNTER_T + 0.011, cz]}>
          <boxGeometry args={[wx * 0.7, 0.02, wz * 0.7]} />
          <meshStandardMaterial color={HOB} roughness={0.4} />
        </mesh>
      )}
      {unit.type === 'sink' && (
        <mesh position={[cx, COUNTER_H - 0.04, cz]}>
          <boxGeometry args={[wx * 0.55, 0.10, wz * 0.6]} />
          <meshStandardMaterial color={STEEL} metalness={0.4} roughness={0.3} />
        </mesh>
      )}
    </group>
  )
}

// Standalone — render inside the centered model group of Cabin3D,
// which already maps plan (x, y) → world (x, y) and centers the model.
export default function Kitchen3D() {
  return kitchenUnitRects().map(r => <Unit key={r.unit.id} r={r} />)
}
