import { TV } from './cabinData.js'

const WOOD   = '#7a6652'
const SCREEN = '#0d1013'
const FRAME  = '#1a1a1a'

// facing → rotation about Y of the canonical (faces-south, +z) unit
const ROT_Y = { south: 0, west: -Math.PI / 2, north: Math.PI, east: Math.PI / 2 }

// Standalone — render inside Cabin3D's centered group (plan coords = world).
// Drawn canonically facing SOUTH (+z): console with the screen on the north
// (-z) side; positioned at (cx, cy) and rotated to face `facing`.
export default function Tv3D() {
  const { cx, cy, consoleW, consoleD, consoleH, panelW, panelH, panelSill, facing } = TV
  const panelZ = -consoleD / 2 + 0.03
  return (
    <group position={[cx, 0, cy]} rotation={[0, ROT_Y[facing] ?? 0, 0]}>
      {/* media console */}
      <mesh position={[0, consoleH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[consoleW, consoleH, consoleD]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      {/* TV frame */}
      <mesh position={[0, panelSill + panelH / 2, panelZ]} castShadow>
        <boxGeometry args={[panelW + 0.04, panelH + 0.04, 0.05]} />
        <meshStandardMaterial color={FRAME} roughness={0.5} />
      </mesh>
      {/* screen (faces +z in canonical) */}
      <mesh position={[0, panelSill + panelH / 2, panelZ + 0.03]}>
        <boxGeometry args={[panelW, panelH, 0.02]} />
        <meshStandardMaterial color={SCREEN} roughness={0.15} metalness={0.3} />
      </mesh>
    </group>
  )
}
