import { kitchenUnitRects } from './Kitchen.jsx'
import { W_BOTTOM, KITCHEN_UPPER } from './cabinData.js'

// Heights / palette (match the 2D olive scheme)
const COUNTER_H = 0.90
const COUNTER_T = 0.04
const FRIDGE_H  = 2.00
const OLIVE     = '#7c8559'
const OLIVE_DK  = '#4d5436'
const TOP       = '#cfcab8'
const HOB       = '#2b2b2b'
const STEEL     = '#b8bdba'
const METAL     = '#8a8f8c'

// A horizontal groove/handle on the room-facing front (at x = fx).
function Front({ fx, y, cz, wz, h = 0.018, color = OLIVE_DK }) {
  return (
    <mesh position={[fx - 0.006, y, cz]}>
      <boxGeometry args={[0.012, h, wz * 0.9]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={color === METAL ? 0.6 : 0} />
    </mesh>
  )
}

function Unit({ r }) {
  const { unit, x1m, x2m, y1m, y2m } = r
  const cx = (x1m + x2m) / 2
  const cz = (y1m + y2m) / 2
  const wx = x2m - x1m
  const wz = y2m - y1m
  const fx = x1m              // room-facing front (kitchen on the right wall)
  const wallX = x2m           // wall side

  // ── Fridge column ───────────────────────────────────────────────
  if (unit.type === 'fridge') {
    return (
      <group>
        <mesh position={[cx, FRIDGE_H / 2, cz]} castShadow receiveShadow>
          <boxGeometry args={[wx, FRIDGE_H, wz]} />
          <meshStandardMaterial color={OLIVE_DK} roughness={0.8} />
        </mesh>
        {/* door seam between fridge & freezer */}
        <Front fx={fx} y={FRIDGE_H * 0.55} cz={cz} wz={wz} h={0.02} color={OLIVE} />
        {/* tall vertical handle */}
        <mesh position={[fx - 0.02, FRIDGE_H * 0.5, cz - wz * 0.4]}>
          <boxGeometry args={[0.03, FRIDGE_H * 0.6, 0.03]} />
          <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    )
  }

  // ── Base units (carcass + countertop) ───────────────────────────
  const burners = []
  if (unit.type === 'hob') {
    const xs = [cx - wx * 0.18, cx + wx * 0.18]
    const zs = [cz - wz * 0.22, cz + wz * 0.22]
    xs.forEach((bx, i) => zs.forEach((bz, j) => burners.push(
      <mesh key={`${i}-${j}`} position={[bx, COUNTER_H + COUNTER_T + 0.012, bz]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[Math.min(wx, wz) * 0.13, 0.007, 8, 24]} />
        <meshStandardMaterial color="#666" metalness={0.4} roughness={0.4} />
      </mesh>
    )))
  }

  return (
    <group>
      {/* carcass */}
      <mesh position={[cx, COUNTER_H / 2, cz]} castShadow receiveShadow>
        <boxGeometry args={[wx, COUNTER_H, wz]} />
        <meshStandardMaterial color={unit.type === 'dishwasher' ? '#8b936b' : OLIVE} roughness={0.85} />
      </mesh>
      {/* countertop */}
      <mesh position={[cx, COUNTER_H + COUNTER_T / 2, cz]} castShadow>
        <boxGeometry args={[wx + 0.02, COUNTER_T, wz + 0.02]} />
        <meshStandardMaterial color={TOP} roughness={0.55} />
      </mesh>

      {/* ── Drawer fronts (cabinet only) ── */}
      {unit.type === 'cabinet' && [0.30, 0.60].map((f, i) => (
        <Front key={i} fx={fx} y={COUNTER_H * f} cz={cz} wz={wz} />
      ))}

      {/* ── Built-in electric oven under the hob ── */}
      {unit.type === 'hob' && (() => {
        const ox = fx - 0.012
        return (
          <group>
            {/* oven door panel */}
            <mesh position={[ox, 0.42, cz]} castShadow>
              <boxGeometry args={[0.02, 0.62, wz * 0.92]} />
              <meshStandardMaterial color="#3a3b3d" roughness={0.4} metalness={0.5} />
            </mesh>
            {/* glass window */}
            <mesh position={[ox - 0.006, 0.40, cz]}>
              <boxGeometry args={[0.012, 0.30, wz * 0.62]} />
              <meshStandardMaterial color="#15171a" roughness={0.2} metalness={0.3} />
            </mesh>
            {/* handle bar near the top of the door */}
            <mesh position={[ox - 0.03, 0.70, cz]}>
              <boxGeometry args={[0.03, 0.025, wz * 0.72]} />
              <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.25} />
            </mesh>
            {/* control panel + knobs just below the countertop */}
            <mesh position={[ox, 0.82, cz]}>
              <boxGeometry args={[0.02, 0.10, wz * 0.92]} />
              <meshStandardMaterial color="#2b2c2e" roughness={0.4} metalness={0.4} />
            </mesh>
            {[-1, 0, 1].map(k => (
              <mesh key={k} position={[ox - 0.02, 0.82, cz + k * wz * 0.22]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.016, 0.016, 0.03, 12]} />
                <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.3} />
              </mesh>
            ))}
          </group>
        )
      })()}
      {(unit.type === 'cabinet') && [0.18, 0.48, 0.78].map((f, i) => (
        <Front key={`h${i}`} fx={fx} y={COUNTER_H * f} cz={cz} wz={wz * 0.45} h={0.025} color={METAL} />
      ))}

      {/* ── Dishwasher: integrated panel + top control bar + handle ── */}
      {unit.type === 'dishwasher' && (
        <>
          <Front fx={fx} y={COUNTER_H * 0.86} cz={cz} wz={wz} h={0.03} color={OLIVE_DK} />
          <Front fx={fx} y={COUNTER_H * 0.80} cz={cz} wz={wz * 0.4} h={0.02} color={METAL} />
        </>
      )}

      {/* ── Hob: dark glass top + burner rings ── */}
      {unit.type === 'hob' && (
        <mesh position={[cx, COUNTER_H + COUNTER_T + 0.006, cz]}>
          <boxGeometry args={[wx * 0.78, 0.012, wz * 0.78]} />
          <meshStandardMaterial color={HOB} roughness={0.25} metalness={0.2} />
        </mesh>
      )}
      {burners}

      {/* ── Sink: recessed steel basin + faucet ── */}
      {unit.type === 'sink' && (
        <>
          <mesh position={[cx, COUNTER_H - 0.04, cz]}>
            <boxGeometry args={[wx * 0.5, 0.12, wz * 0.6]} />
            <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.25} />
          </mesh>
          {/* faucet: upright + spout, near the wall */}
          <mesh position={[wallX - 0.12, COUNTER_H + 0.14, cz]}>
            <cylinderGeometry args={[0.014, 0.014, 0.28, 12]} />
            <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.2} />
          </mesh>
          <mesh position={[wallX - 0.19, COUNTER_H + 0.27, cz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.16, 12]} />
            <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.2} />
          </mesh>
        </>
      )}
    </group>
  )
}

// Upper (wall) cabinet on the right wall, north of the window.
function UpperCabinet() {
  const u = KITCHEN_UPPER
  const x2 = W_BOTTOM, x1 = W_BOTTOM - u.depth
  const cx = (x1 + x2) / 2, wx = u.depth
  const cz = (u.y1 + u.y2) / 2, wz = u.y2 - u.y1
  const cy = u.bottom + u.height / 2
  const fx = x1   // room-facing front
  return (
    <group>
      <mesh position={[cx, cy, cz]} castShadow receiveShadow>
        <boxGeometry args={[wx, u.height, wz]} />
        <meshStandardMaterial color={OLIVE} roughness={0.85} />
      </mesh>
      {/* center door seam */}
      <mesh position={[fx - 0.006, cy, cz]}>
        <boxGeometry args={[0.012, u.height * 0.9, 0.008]} />
        <meshStandardMaterial color={OLIVE_DK} roughness={0.6} />
      </mesh>
      {/* two door handles near the bottom edge */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[fx - 0.02, u.bottom + 0.08, cz + s * wz * 0.22]}>
          <boxGeometry args={[0.03, 0.10, 0.02]} />
          <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// Standalone — render inside the centered model group of Cabin3D,
// which already maps plan (x, y) → world (x, y) and centers the model.
export default function Kitchen3D() {
  return (
    <group>
      {kitchenUnitRects().map(r => <Unit key={r.unit.id} r={r} />)}
      <UpperCabinet />
    </group>
  )
}
