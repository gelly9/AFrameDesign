import { W_BOTTOM, H_LEFT, KITCHEN, KITCHEN_RUN } from './cabinData.js'

// Olive palette (matches the reference elevation)
const OLIVE    = '#7c8559'
const OLIVE_DK = '#4d5436'
const OLIVE_LT = '#9ba074'
const TOP_EDGE = '#cfcab8'
const SINK     = '#c7ccc9'
const HOB      = '#2b2b2b'
const FONT     = "'Helvetica Neue',Arial,sans-serif"

// Walls are now built outward from the interior line, so the run sits
// flush against the interior wall face (no inset needed).
const WALL_INSET = 0

// ── Compute each unit's footprint in plan meters ──────────────────
// Vertical run along a side wall, anchored at the bottom, running up.
// Mirrored: the fridge (last unit) sits at the bottom (6.60m wall).
export function kitchenUnitRects() {
  const { depth, units } = KITCHEN
  const wallX  = KITCHEN.wall === 'right' ? W_BOTTOM - WALL_INSET : WALL_INSET
  const innerX = KITCHEN.wall === 'right' ? wallX - depth : wallX + depth
  const x1m = Math.min(wallX, innerX)
  const x2m = Math.max(wallX, innerX)

  const ordered = [...units].reverse()   // fridge first → placed at the bottom
  let cum = 0
  return ordered.map(u => {
    const y2m = H_LEFT - WALL_INSET - cum   // bottom of this unit
    const y1m = y2m - u.w                    // top of this unit
    cum += u.w
    return { unit: u, x1m, x2m, y1m, y2m, wallSide: KITCHEN.wall }
  })
}

// ── Per-unit-type top-down symbol ─────────────────────────────────
function UnitSymbol({ type, x, y, w, h, wallSide }) {
  const wallEdgeX = wallSide === 'right' ? x + w : x   // x of the wall side
  const roomEdgeX = wallSide === 'right' ? x : x + w   // x of the room side

  switch (type) {
    case 'sink': {
      const m = Math.min(w, h) * 0.16
      return (
        <g>
          <rect x={x + m} y={y + m} width={w - 2 * m} height={h - 2 * m}
                rx={4} fill={SINK} stroke={OLIVE_DK} strokeWidth={1} />
          {/* faucet near the wall */}
          <circle cx={wallEdgeX + (wallSide === 'right' ? -m * 0.7 : m * 0.7)}
                  cy={y + h / 2} r={2.5} fill={OLIVE_DK} />
        </g>
      )
    }
    case 'hob': {
      const r = Math.min(w, h) * 0.13
      const xs = [x + w * 0.32, x + w * 0.68]
      const ys = [y + h * 0.30, y + h * 0.70]
      return (
        <g>
          <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={3}
                fill={HOB} opacity={0.92} />
          {xs.map((cx, i) => ys.map((cy, j) => (
            <circle key={`${i}-${j}`} cx={cx} cy={cy} r={r}
                    fill="none" stroke="#777" strokeWidth={1.2} />
          )))}
        </g>
      )
    }
    case 'dishwasher':
      return (
        <g>
          <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={2}
                fill={OLIVE_LT} stroke={OLIVE_DK} strokeWidth={1} />
          <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle"
                fontSize={9} fontWeight={700} fill={OLIVE_DK} fontFamily={FONT}>DW</text>
        </g>
      )
    case 'fridge':
      return (
        <g>
          <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={2}
                fill={OLIVE_DK} />
          {/* handle near the room side */}
          <line x1={roomEdgeX + (wallSide === 'right' ? 6 : -6)} y1={y + h * 0.3}
                x2={roomEdgeX + (wallSide === 'right' ? 6 : -6)} y2={y + h * 0.7}
                stroke={OLIVE_LT} strokeWidth={2} strokeLinecap="round" />
          <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle"
                fontSize={8} fontWeight={700} fill={OLIVE_LT} fontFamily={FONT}>FRIDGE</text>
        </g>
      )
    case 'cabinet': {
      // drawer fronts: lines across the depth, stacked along the run
      const n = 3
      const lines = []
      for (let k = 1; k < n; k++) {
        const ly = y + (h * k) / n
        lines.push(<line key={k} x1={x + 4} y1={ly} x2={x + w - 4} y2={ly}
                         stroke={OLIVE_DK} strokeWidth={0.8} />)
      }
      return <g>{lines}</g>
    }
    case 'counter':
    default:
      return null
  }
}

// ── The full kitchen run ──────────────────────────────────────────
// Standalone: pass the parent's coordinate mappers (px, py) + scale.
export default function Kitchen({ px, py, scale }) {
  const rects = kitchenUnitRects()
  return (
    <g>
      {rects.map(({ unit, x1m, x2m, y1m, y2m, wallSide }) => {
        const x = px(x1m), y = py(y1m)
        const w = (x2m - x1m) * scale
        const h = (y2m - y1m) * scale
        return (
          <g key={unit.id}>
            {/* carcass */}
            <rect x={x} y={y} width={w} height={h}
                  fill={OLIVE} stroke={OLIVE_DK} strokeWidth={1.2} />
            {/* countertop edge on the room-facing side */}
            <line
              x1={wallSide === 'right' ? x : x + w} y1={y}
              x2={wallSide === 'right' ? x : x + w} y2={y + h}
              stroke={TOP_EDGE} strokeWidth={2.5} />
            <UnitSymbol type={unit.type} x={x} y={y} w={w} h={h} wallSide={wallSide} />
            {/* unit number */}
            <text x={x + w / 2} y={y + 12} textAnchor="middle"
                  fontSize={8} fontWeight={700} fill="#fff" opacity={0.85}
                  fontFamily={FONT}>{unit.id}</text>
          </g>
        )
      })}
      {/* run total label — rotated, on the room-facing side of the run */}
      {(() => {
        const first = rects[0], last = rects[rects.length - 1]
        const roomEdgeM = KITCHEN.wall === 'right' ? first.x1m : first.x2m
        const lx = px(roomEdgeM) + (KITCHEN.wall === 'right' ? -10 : 10)
        const ly = (py(first.y2m) + py(last.y1m)) / 2
        return (
          <text x={lx} y={ly} textAnchor="middle"
                transform={`rotate(-90 ${lx} ${ly})`}
                fontSize={9} fontWeight={700} fill={OLIVE_DK} fontFamily={FONT}>
            KITCHEN {KITCHEN_RUN.toFixed(2)} m
          </text>
        )
      })()}
    </g>
  )
}
