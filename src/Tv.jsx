import { TV } from './cabinData.js'

const WOOD    = '#7a6652'
const WOOD_DK = '#574737'
const SCREEN  = '#1a1f24'

// Standalone 2D top-down TV: console + panel on its north edge (faces south).
export default function Tv({ px, py, scale }) {
  const { cx, consoleY, consoleW, consoleD, panelW } = TV
  const X = px(cx - consoleW / 2), Y = py(consoleY - consoleD / 2)
  const W = consoleW * scale, D = consoleD * scale
  const pW = panelW * scale
  return (
    <g>
      {/* console */}
      <rect x={X} y={Y} width={W} height={D} rx={3}
            fill={WOOD} stroke={WOOD_DK} strokeWidth={1.2} />
      {/* TV panel on the north edge (thicker dark bar) */}
      <rect x={px(cx) - pW / 2} y={Y - 5} width={pW} height={5}
            fill={SCREEN} stroke={WOOD_DK} strokeWidth={0.8} />
      <text x={px(cx)} y={py(consoleY) + 4} textAnchor="middle"
            fontSize={9} fontWeight={700} fill="#fff" opacity={0.85}
            fontFamily="'Helvetica Neue',Arial,sans-serif">TV</text>
    </g>
  )
}
