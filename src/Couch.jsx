import { COUCH } from './cabinData.js'

const FABRIC    = '#8d9bb0'
const FABRIC_DK = '#6f7d92'
const ARM_W  = 0.16   // armrest width (m)
const BACK_T = 0.18   // backrest depth (m)

// facing → clockwise rotation of the canonical (faces-south) drawing
export const COUCH_ROT2D = {
  south: 0, west: 90, north: 180, east: 270,
  southwest: 45, southeast: 315, northwest: 135, northeast: 225,
}

// Standalone 2D top-down couch. Drawn canonically facing SOUTH (backrest
// on the north/top edge), then rotated about its center to face `facing`.
export default function Couch({ px, py, scale, data = COUCH }) {
  const { cx, cy, w, d, facing } = data
  const W = w * scale, D = d * scale
  const arm = ARM_W * scale
  const back = BACK_T * scale
  const x0 = -W / 2, y0 = -D / 2
  const seatX = x0 + arm, seatW = W - 2 * arm
  const seatY = y0 + back, seatH = D - back
  const cushions = [0, 1, 2].map(i => (
    <rect key={i} x={seatX + (seatW / 3) * i + 2} y={seatY + 2}
          width={seatW / 3 - 4} height={seatH - 4} rx={3}
          fill={FABRIC} stroke={FABRIC_DK} strokeWidth={1} />
  ))
  return (
    <g transform={`translate(${px(cx)},${py(cy)}) rotate(${COUCH_ROT2D[facing] ?? 0})`}>
      <rect x={x0} y={y0} width={W} height={D} rx={6} fill={FABRIC_DK} stroke="#566273" strokeWidth={1.4} />
      <rect x={x0} y={y0} width={W} height={back} fill={FABRIC_DK} />
      <rect x={x0} y={y0} width={arm} height={D} rx={4} fill={FABRIC_DK} />
      <rect x={x0 + W - arm} y={y0} width={arm} height={D} rx={4} fill={FABRIC_DK} />
      {cushions}
    </g>
  )
}
