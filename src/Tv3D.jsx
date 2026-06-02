import { TV } from './cabinData.js'

const WOOD    = '#7a6652'
const SCREEN  = '#0d1013'
const FRAME   = '#1a1a1a'

// Standalone — render inside Cabin3D's centered group (plan coords = world).
// Console at the north end; flat TV panel above it facing south.
export default function Tv3D() {
  const { cx, consoleY, consoleW, consoleD, consoleH, panelW, panelH, panelSill } = TV
  const panelZ = consoleY - consoleD / 2 + 0.03   // panel near the north face
  return (
    <group>
      {/* media console */}
      <mesh position={[cx, consoleH / 2, consoleY]} castShadow receiveShadow>
        <boxGeometry args={[consoleW, consoleH, consoleD]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      {/* TV frame */}
      <mesh position={[cx, panelSill + panelH / 2, panelZ]} castShadow>
        <boxGeometry args={[panelW + 0.04, panelH + 0.04, 0.05]} />
        <meshStandardMaterial color={FRAME} roughness={0.5} />
      </mesh>
      {/* screen */}
      <mesh position={[cx, panelSill + panelH / 2, panelZ - 0.03]}>
        <boxGeometry args={[panelW, panelH, 0.02]} />
        <meshStandardMaterial color={SCREEN} roughness={0.15} metalness={0.3} />
      </mesh>
    </group>
  )
}
