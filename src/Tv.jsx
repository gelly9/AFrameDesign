import { TV } from './cabinData.js'

const WOOD    = '#7a6652'
const WOOD_DK = '#574737'
const SCREEN  = '#1a1f24'

// facing → clockwise rotation of the canonical (faces-south) drawing
const TV_ROT2D = {
  south: 0, west: 90, north: 180, east: 270,
  southwest: 45, southeast: 315, northwest: 135, northeast: 225,
}

// Standalone 2D top-down TV. Drawn canonically facing SOUTH (console with
// the screen panel on the north/top edge), then rotated to face `facing`.
export default function Tv({ px, py, scale }) {
  const { cx, cy, consoleW, consoleD, panelW, facing } = TV
  const W = consoleW * scale, D = consoleD * scale
  const pW = panelW * scale
  const x0 = -W / 2, y0 = -D / 2
  return (
    <g transform={`translate(${px(cx)},${py(cy)}) rotate(${TV_ROT2D[facing] ?? 0})`}>
      {/* console */}
      <rect x={x0} y={y0} width={W} height={D} rx={3} fill={WOOD} stroke={WOOD_DK} strokeWidth={1.2} />
      {/* TV panel on the north (top) edge */}
      <rect x={-pW / 2} y={y0 - 5} width={pW} height={5} fill={SCREEN} stroke={WOOD_DK} strokeWidth={0.8} />
      <text x={0} y={4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff" opacity={0.85}
            fontFamily="'Helvetica Neue',Arial,sans-serif">TV</text>
    </g>
  )
}
