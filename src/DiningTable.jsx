import { DINING } from './cabinData.js'

const WOOD     = '#b5895f'
const WOOD_DK  = '#8c6741'
const CHAIR    = '#c9a87c'
const CHAIR_DK = '#9c7748'
const FONT     = "'Helvetica Neue',Arial,sans-serif"

// How far a tucked chair protrudes past the table edge.
export const CHAIR_TUCK = 0.06

// Chair centers (plan meters) with the side they face. Tucked: chairs
// slide under the tabletop, protruding only CHAIR_TUCK. A square table
// gets one chair per side; a rectangle gets two on each long side.
export function diningChairCenters() {
  const { cx, cy, w, d, chair } = DINING
  const offX = w / 2 - chair / 2 + CHAIR_TUCK
  const offY = d / 2 - chair / 2 + CHAIR_TUCK
  if (Math.abs(d - w) < 0.20) {
    return [
      { x: cx,        y: cy - offY, face: 'north' },
      { x: cx,        y: cy + offY, face: 'south' },
      { x: cx - offX, y: cy,        face: 'west'  },
      { x: cx + offX, y: cy,        face: 'east'  },
    ]
  }
  if (d > w) {                       // long axis N-S → chairs on E/W sides
    const s = d * 0.24
    return [
      { x: cx - offX, y: cy - s, face: 'west' },
      { x: cx - offX, y: cy + s, face: 'west' },
      { x: cx + offX, y: cy - s, face: 'east' },
      { x: cx + offX, y: cy + s, face: 'east' },
    ]
  }
  const s = w * 0.24                 // long axis E-W → chairs on N/S sides
  return [
    { x: cx - s, y: cy - offY, face: 'north' },
    { x: cx + s, y: cy - offY, face: 'north' },
    { x: cx - s, y: cy + offY, face: 'south' },
    { x: cx + s, y: cy + offY, face: 'south' },
  ]
}

// Standalone 2D top-down table. Pass the parent's px/py mappers + scale.
export default function DiningTable({ px, py, scale }) {
  const { cx, cy, w, d, chair } = DINING
  const tx = px(cx - w / 2), ty = py(cy - d / 2)
  const tw = w * scale, th = d * scale
  const cs = chair * scale
  return (
    <g>
      {/* chairs */}
      {diningChairCenters().map((c, i) => (
        <rect key={i} x={px(c.x) - cs / 2} y={py(c.y) - cs / 2} width={cs} height={cs}
              rx={4} fill={CHAIR} stroke={CHAIR_DK} strokeWidth={1.1} />
      ))}
      {/* table top */}
      <rect x={tx} y={ty} width={tw} height={th} rx={5}
            fill={WOOD} stroke={WOOD_DK} strokeWidth={1.4} />
      <text x={px(cx)} y={py(cy) + 4} textAnchor="middle"
            fontSize={9} fontWeight={700} fill="#fff" opacity={0.85}
            fontFamily={FONT} letterSpacing={1}>DINING</text>
    </g>
  )
}
