import { COUCH } from './cabinData.js'

const FABRIC    = '#8d9bb0'
const FABRIC_DK = '#6f7d92'
const ARM_W  = 0.16   // armrest width (m)
const BACK_T = 0.18   // backrest depth (m)

// Standalone 2D top-down couch. Backrest sits opposite the facing side.
export default function Couch({ px, py, scale }) {
  const { cx, cy, w, d, facing } = COUCH
  const X = px(cx - w / 2), Y = py(cy - d / 2)
  const W = w * scale, D = d * scale
  const arm = ARM_W * scale
  const back = BACK_T * scale
  const backAtTop = facing === 'south'           // backrest on north edge when facing south
  const backY = backAtTop ? Y : Y + D - back
  const seatX = X + arm
  const seatW = W - 2 * arm
  const seatY = backAtTop ? Y + back : Y
  const seatH = D - back
  const cushions = [0, 1, 2].map(i => (
    <rect key={i} x={seatX + (seatW / 3) * i + 2} y={seatY + 2}
          width={seatW / 3 - 4} height={seatH - 4} rx={3}
          fill={FABRIC} stroke={FABRIC_DK} strokeWidth={1} />
  ))
  return (
    <g>
      <rect x={X} y={Y} width={W} height={D} rx={6} fill={FABRIC_DK} stroke="#566273" strokeWidth={1.4} />
      <rect x={X} y={backY} width={W} height={back} fill={FABRIC_DK} />
      <rect x={X} y={Y} width={arm} height={D} rx={4} fill={FABRIC_DK} />
      <rect x={X + W - arm} y={Y} width={arm} height={D} rx={4} fill={FABRIC_DK} />
      {cushions}
    </g>
  )
}
