import { COUCH } from './cabinData.js'

const FABRIC    = '#8d9bb0'
const FABRIC_DK = '#6f7d92'
const ARM_W  = 0.16   // armrest width (m)
const BACK_T = 0.18   // backrest depth (m)

// Standalone 2D top-down couch (facing south: back on north edge).
export default function Couch({ px, py, scale }) {
  const { cx, cy, w, d } = COUCH
  const x = cx - w / 2, y = cy - d / 2
  const X = px(x), Y = py(y)
  const W = w * scale, D = d * scale
  const arm = ARM_W * scale
  const back = BACK_T * scale
  // three seat cushions in the area between the arms, below the backrest
  const seatX = X + arm
  const seatW = W - 2 * arm
  const seatY = Y + back
  const seatH = D - back
  const cushions = [0, 1, 2].map(i => (
    <rect key={i} x={seatX + (seatW / 3) * i + 2} y={seatY + 2}
          width={seatW / 3 - 4} height={seatH - 4} rx={3}
          fill={FABRIC} stroke={FABRIC_DK} strokeWidth={1} />
  ))
  return (
    <g>
      {/* body */}
      <rect x={X} y={Y} width={W} height={D} rx={6} fill={FABRIC_DK} stroke="#566273" strokeWidth={1.4} />
      {/* backrest (north) */}
      <rect x={X} y={Y} width={W} height={back} fill={FABRIC_DK} />
      {/* armrests */}
      <rect x={X} y={Y} width={arm} height={D} rx={4} fill={FABRIC_DK} />
      <rect x={X + W - arm} y={Y} width={arm} height={D} rx={4} fill={FABRIC_DK} />
      {/* seat cushions */}
      {cushions}
    </g>
  )
}
