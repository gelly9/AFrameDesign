import { BAR } from './cabinData.js'

const WOOD     = '#8a5a36'
const WOOD_DK  = '#5f3f27'
const STOOL    = '#9c6b3f'
const STOOL_DK = '#5f3f27'
const FONT     = "'Helvetica Neue',Arial,sans-serif"

// Stool centers (plan meters): two per long side, both sides of the bar.
export function barStoolCenters() {
  const { cx, cy, w } = BAR
  const offX = w / 2 + 0.20
  const ys = [cy - 0.42, cy + 0.42]
  const centers = []
  for (const side of [-1, 1]) for (const y of ys) centers.push({ x: cx + side * offX, y })
  return centers
}

// Standalone 2D top-down bar. Pass the parent's px/py mappers + scale.
export default function Bar({ px, py, scale }) {
  const { cx, cy, w, d, stoolR } = BAR
  const tx = px(cx - w / 2), ty = py(cy - d / 2)
  const tw = w * scale, th = d * scale
  const r = stoolR * scale
  return (
    <g>
      {/* stools */}
      {barStoolCenters().map((c, i) => (
        <circle key={i} cx={px(c.x)} cy={py(c.y)} r={r}
                fill={STOOL} stroke={STOOL_DK} strokeWidth={1.1} />
      ))}
      {/* bar top */}
      <rect x={tx} y={ty} width={tw} height={th} rx={3}
            fill={WOOD} stroke={WOOD_DK} strokeWidth={1.4} />
      <text x={px(cx)} y={py(cy) + 4} textAnchor="middle"
            fontSize={9} fontWeight={700} fill="#fff" opacity={0.85}
            fontFamily={FONT} letterSpacing={1}
            transform={`rotate(90 ${px(cx)} ${py(cy)})`}>BAR</text>
    </g>
  )
}
