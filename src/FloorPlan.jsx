import {
  W_TOP, H_LEFT, W_BOTTOM, H_RIGHT, STEP_Y, STEP_W,
  ROOM_POLYGON,
  ENTRANCE, TERRACE_DOOR, BATHROOM_DOOR, RIGHT_WINDOW, TOP_WINDOW,
  STUD_SIZE, STUDS as RAW_STUDS, FLOOR_AREA,
  STAIR, STAIR_X1, STAIR_X2, STAIR_Y1, STAIR_Y2,
  WALL_THICK, DINING, COUCH, ARMCHAIR, BEAMS,
} from './cabinData.js'
import Kitchen from './Kitchen'
import DiningTable, { CHAIR_TUCK } from './DiningTable'
import Couch from './Couch'
import Tv from './Tv'

const SCALE = 95
// Walls are drawn OUTWARD from the interior line: a centered stroke of
// 2×thickness with the floor painted on top leaves only the outer half.
const WALL_W = 2 * WALL_THICK * SCALE  // full centered stroke width (px)
const BAND   = WALL_THICK * SCALE      // visible wall thickness (px)

const ENT_LEFT  = ENTRANCE.fromLeft
const ENT_WIDTH = ENTRANCE.width
const TDOOR_WIDTH = TERRACE_DOOR.width
const TDOOR_TOP   = STEP_Y + TERRACE_DOOR.fromTop   // door starts this far below inner step wall
const TDOOR_BOT   = TDOOR_TOP + TDOOR_WIDTH

// Bathroom door derived plan positions
const BDOOR_WIDTH = BATHROOM_DOOR.width
const BDOOR_Y2    = STEP_Y - BATHROOM_DOOR.fromBottom
const BDOOR_Y1    = BDOOR_Y2 - BDOOR_WIDTH

// Right-wall window derived positions
const WIN_HEIGHT   = RIGHT_WINDOW.width
const WIN_FROM_BOT = RIGHT_WINDOW.fromBottom
const WIN_FROM_TOP = H_RIGHT - WIN_FROM_BOT - WIN_HEIGHT

// Top-wall window derived positions
const WIN2_WIDTH = TOP_WINDOW.width
const WIN2_X1    = W_TOP - TOP_WINDOW.fromRight - WIN2_WIDTH
const WIN2_X2    = WIN2_X1 + WIN2_WIDTH

// Studs: attach dimension annotations
const STUDS = RAW_STUDS.map(s => {
  const dims = []
  if (s.cx > W_BOTTOM / 2) dims.push({ kind: 'h', from: 'right',  label: `${(W_BOTTOM - (s.cx + STUD_SIZE / 2)).toFixed(2)} m` })
  else                     dims.push({ kind: 'h', from: 'left',   label: `${(s.cx - STUD_SIZE / 2).toFixed(2)} m` })
  if (s.cy > H_LEFT / 2)   dims.push({ kind: 'v', from: 'bottom', label: `${(H_LEFT - s.cy).toFixed(2)} m` })
  else                     dims.push({ kind: 'v', from: 'top',    label: `${s.cy.toFixed(2)} m` })
  return { ...s, dims }
})

// Canvas
const MARGIN_L = 140
const MARGIN_T = 170   // more room for title + window dims on top
const MARGIN_R = 230
const MARGIN_B = 200

const roomW = W_BOTTOM * SCALE
const roomH = H_LEFT   * SCALE
const svgW  = MARGIN_L + roomW + MARGIN_R
const svgH  = MARGIN_T + roomH + MARGIN_B

const OX = MARGIN_L
const OY = MARGIN_T
const px = m => OX + m * SCALE
const py = m => OY + m * SCALE

// Color tokens
const C = {
  wall:    '#374151',  // dark gray — structural wall dims
  opening: '#3a7ca5',  // blue — door & window dims
  stud:    '#8b6f47',  // warm brown — stud dims
  helper:  '#b0b8c4',  // extension lines
  beam:    '#b58a52',  // beams (overhead, dashed)
  furn:    '#7c8559',  // furniture accent
  ink:     '#1a1a2e',  // headings
  sub:     '#6b7280',  // subtext
  sheet:   '#ddd6c4',  // sheet border
}
const FONT = "'Helvetica Neue', Arial, sans-serif"

const roomPoints = ROOM_POLYGON.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')

function Grid() {
  const lines = []
  for (let x = 1; x < W_BOTTOM; x++)
    lines.push(<line key={`gx${x}`} x1={px(x)} y1={py(0)} x2={px(x)} y2={py(H_LEFT)} />)
  for (let y = 1; y < H_LEFT; y++)
    lines.push(<line key={`gy${y}`} x1={px(0)} y1={py(y)} x2={px(W_BOTTOM)} y2={py(y)} />)
  return (
    <g clipPath="url(#roomClip)" stroke="#d4cabb" strokeWidth={0.6} opacity={0.55}>
      {lines}
    </g>
  )
}

function HDim({ x1m, x2m, ym, label, above = true, gap = 32, color = C.wall }) {
  const sign = above ? -1 : 1
  const yL   = py(ym) + sign * gap
  const x1   = px(x1m), x2 = px(x2m), mx = (x1 + x2) / 2
  return (
    <g>
      <line x1={x1} y1={py(ym)} x2={x1} y2={yL} stroke={C.helper} strokeWidth={0.8} />
      <line x1={x2} y1={py(ym)} x2={x2} y2={yL} stroke={C.helper} strokeWidth={0.8} />
      <line x1={x1} y1={yL} x2={x2} y2={yL} stroke={color} strokeWidth={1.1}
            markerStart={`url(#arrowEnd-${color === C.wall ? 'g' : color === C.opening ? 'b' : 'r'})`}
            markerEnd={`url(#arrow-${color === C.wall ? 'g' : color === C.opening ? 'b' : 'r'})`} />
      <rect x={mx - 26} y={yL + (above ? -17 : 3)} width={52} height={15}
            fill="#fff" rx={2} />
      <text x={mx} y={yL + (above ? -5 : 13)} textAnchor="middle"
            fontSize={12} fill={color} fontWeight={500}
            fontFamily="'Helvetica Neue',Arial,sans-serif">{label}</text>
    </g>
  )
}

function VDim({ xm, y1m, y2m, label, side = 'right', gap = 40, color = C.wall }) {
  const sign = side === 'right' ? 1 : -1
  const xL   = px(xm) + sign * gap
  const y1   = py(y1m), y2 = py(y2m), my = (y1 + y2) / 2
  const tw   = 48
  return (
    <g>
      <line x1={px(xm)} y1={y1} x2={xL} y2={y1} stroke={C.helper} strokeWidth={0.8} />
      <line x1={px(xm)} y1={y2} x2={xL} y2={y2} stroke={C.helper} strokeWidth={0.8} />
      <line x1={xL} y1={y1} x2={xL} y2={y2} stroke={color} strokeWidth={1.1}
            markerStart={`url(#arrowEnd-${color === C.wall ? 'g' : color === C.opening ? 'b' : 'r'})`}
            markerEnd={`url(#arrow-${color === C.wall ? 'g' : color === C.opening ? 'b' : 'r'})`} />
      <rect x={xL + (side === 'right' ? 3 : -tw - 3)} y={my - 8} width={tw} height={16}
            fill="#fff" rx={2} />
      <text x={xL + (side === 'right' ? tw / 2 + 3 : -tw / 2 - 3)} y={my + 5}
            textAnchor="middle" fontSize={12} fill={color} fontWeight={500}
            fontFamily="'Helvetica Neue',Arial,sans-serif">{label}</text>
    </g>
  )
}

function Stud({ stud }) {
  const x = stud.cx - STUD_SIZE / 2
  const y = stud.cy - STUD_SIZE / 2
  const sx = px(x), sy = py(y), s = STUD_SIZE * SCALE
  return (
    <g>
      <rect x={sx} y={sy} width={s} height={s} fill="#8b6f47" stroke="#3d2f1f" strokeWidth={1.2} />
      <line x1={sx} y1={sy} x2={sx + s} y2={sy + s} stroke="#3d2f1f" strokeWidth={0.7} />
      <line x1={sx} y1={sy + s} x2={sx + s} y2={sy} stroke="#3d2f1f" strokeWidth={0.7} />
      <text x={sx + s + 6} y={sy - 4}
            fontSize={11} fontWeight={700} fill={C.stud}
            fontFamily="'Helvetica Neue',Arial,sans-serif">
        {stud.id}
      </text>
    </g>
  )
}

function StudDims({ stud }) {
  const xFaceL = stud.cx - STUD_SIZE / 2   // face toward the left wall
  const xFaceR = stud.cx + STUD_SIZE / 2   // face toward the right wall
  const xMid = stud.cx
  const yMid = stud.cy
  return (
    <g>
      {stud.dims.map((d, i) => {
        // Side (h) dims run to the stud FACE; front/back (v) to the centerline.
        if (d.kind === 'h' && d.from === 'right')
          return <HDim key={i} x1m={xFaceR} x2m={W_BOTTOM} ym={yMid} label={d.label} above gap={26} color={C.stud} />
        if (d.kind === 'h' && d.from === 'left')
          return <HDim key={i} x1m={0} x2m={xFaceL} ym={yMid} label={d.label} above gap={26} color={C.stud} />
        if (d.kind === 'v' && d.from === 'top')
          return <VDim key={i} xm={xMid} y1m={0} y2m={yMid} label={d.label} side="left" gap={36} color={C.stud} />
        if (d.kind === 'v' && d.from === 'bottom')
          return <VDim key={i} xm={xMid} y1m={yMid} y2m={H_LEFT} label={d.label} side="left" gap={36} color={C.stud} />
        return null
      })}
    </g>
  )
}

function Compass({ x, y, r = 24 }) {
  return (
    <g transform={`translate(${x},${y})`} fontFamily={FONT}>
      <circle cx={0} cy={0} r={r} fill="#fbfaf7" stroke="#d1cfc9" strokeWidth={1} />
      <circle cx={0} cy={0} r={r - 4} fill="none" stroke="#e7e2d6" strokeWidth={0.8} />
      {/* needle */}
      <polygon points={`0,${-r + 5} ${r / 5},2 0,0 ${-r / 5},2`} fill={C.opening} />
      <polygon points={`0,${r - 5} ${r / 5},-2 0,0 ${-r / 5},-2`} fill="#c9c5bc" />
      <circle cx={0} cy={0} r={1.8} fill="#374151" />
      <text x={0} y={-r - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>N</text>
    </g>
  )
}

function Legend({ x, y }) {
  const rows = [
    { kind: 'line',   color: '#1e1e1e',  w: 3, label: 'Wall' },
    { kind: 'line',   color: C.opening,  w: 2, label: 'Door / window' },
    { kind: 'swatch', color: C.stud,           label: 'Stud (15×15)' },
    { kind: 'dash',   color: C.beam,     w: 1.4, label: 'Beam (above)' },
    { kind: 'swatch', color: C.furn,           label: 'Furniture' },
  ]
  return (
    <g transform={`translate(${x},${y})`} fontFamily={FONT}>
      <text x={0} y={-8} fontSize={10} fontWeight={700} fill={C.sub} letterSpacing={1.5}>LEGEND</text>
      {rows.map((r, i) => (
        <g key={i} transform={`translate(0,${i * 19 + 6})`}>
          {r.kind === 'line' && <line x1={0} y1={6} x2={24} y2={6} stroke={r.color} strokeWidth={r.w} strokeLinecap="round" />}
          {r.kind === 'dash' && <line x1={0} y1={6} x2={24} y2={6} stroke={r.color} strokeWidth={r.w} strokeDasharray="5,3" />}
          {r.kind === 'swatch' && <rect x={5} y={1} width={13} height={11} rx={2} fill={r.color} />}
          <text x={32} y={10} fontSize={11} fill="#374151">{r.label}</text>
        </g>
      ))}
    </g>
  )
}

// Arrow marker factory (one per color)
function ArrowMarkers() {
  return (
    <>
      {[
        { id: 'g', color: C.wall },
        { id: 'b', color: C.opening },
        { id: 'r', color: C.stud },
      ].map(({ id, color }) => (
        <g key={id}>
          <marker id={`arrow-${id}`} markerWidth="10" markerHeight="10" refX="5" refY="3"
                  orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={color} strokeWidth={1.1} />
          </marker>
          <marker id={`arrowEnd-${id}`} markerWidth="10" markerHeight="10" refX="1" refY="3"
                  orient="auto" markerUnits="userSpaceOnUse">
            <path d="M6,0 L0,3 L6,6" fill="none" stroke={color} strokeWidth={1.1} />
          </marker>
        </g>
      ))}
    </>
  )
}

export default function FloorPlan() {
  const ex1 = px(ENT_LEFT)
  const ex2 = px(ENT_LEFT + ENT_WIDTH)
  const ey  = py(H_LEFT)
  const wy1 = py(STEP_Y + WIN_FROM_TOP)
  const wy2 = py(STEP_Y + WIN_FROM_TOP + WIN_HEIGHT)
  const wx  = px(W_BOTTOM)
  const area = FLOOR_AREA.toFixed(1)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'clamp(8px, 3vw, 48px)', background: '#eeeae4', minHeight: '100vh'
    }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: svgW, height: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.13)' }}
      >
        <defs>
          <ArrowMarkers />
          <clipPath id="roomClip">
            <polygon points={roomPoints} />
          </clipPath>
          <filter id="wallShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#00000022" />
          </filter>
        </defs>

        {/* Sheet border */}
        <rect x={16} y={16} width={svgW - 32} height={svgH - 32} rx={8}
              fill="none" stroke={C.sheet} strokeWidth={1.5} />

        {/* Title block */}
        <rect x={40} y={36} width={5} height={30} rx={2.5} fill={C.opening} />
        <text x={56} y={58} fontSize={23} fontWeight={800} fill={C.ink}
              fontFamily={FONT} letterSpacing={-0.3}>
          A-Frame Cabin — Ground Floor
        </text>
        <text x={56} y={80} fontSize={12.5} fill={C.sub} fontFamily={FONT} letterSpacing={0.4}>
          Kitchen &amp; Living Room  ·  Scale 1:100  ·  Area ≈ {area} m²
        </text>
        <line x1={40} y1={98} x2={svgW - 40} y2={98} stroke="#e5e0d8" strokeWidth={1} />

        {/* Walls — thick stroke centered on the interior line. The floor
            is painted on top afterwards, leaving only the OUTER half, so
            walls sit outside the interior dimensions (0.20m thick). */}
        <polygon points={roomPoints} fill="none" stroke="#1e1e1e"
                 strokeWidth={WALL_W} strokeLinejoin="miter" />

        {/* Opening gaps — erase the wall fully at each opening (before floor) */}
        <g stroke="#fff" strokeWidth={WALL_W}>
          <line x1={ex1} y1={ey} x2={ex2} y2={ey} />
          <line x1={px(WIN2_X1)} y1={py(0)} x2={px(WIN2_X2)} y2={py(0)} />
          <line x1={wx} y1={wy1} x2={wx} y2={wy2} />
          <line x1={px(W_BOTTOM)} y1={py(TDOOR_TOP)} x2={px(W_BOTTOM)} y2={py(TDOOR_BOT)} />
          <line x1={px(W_TOP)} y1={py(BDOOR_Y1)} x2={px(W_TOP)} y2={py(BDOOR_Y2)} />
        </g>

        {/* Floor on top — covers the inner half of the walls */}
        <polygon points={roomPoints} fill="#f0ebe0" />

        {/* Entrance — glass facade in the wall band (4 panels), +y outward */}
        {(() => {
          const cols = ENTRANCE.cols || 1
          const mullions = []
          for (let i = 1; i < cols; i++) {
            const mx = ex1 + ((ex2 - ex1) * i) / cols
            mullions.push(<line key={i} x1={mx} y1={ey} x2={mx} y2={ey + BAND} stroke="#1e1e1e" strokeWidth={1.4} />)
          }
          return (
            <g>
              <rect x={ex1} y={ey} width={ex2 - ex1} height={BAND}
                    fill="rgba(147,210,235,0.4)" stroke={C.opening} strokeWidth={1.5} />
              {mullions}
              {/* jambs */}
              <line x1={ex1} y1={ey} x2={ex1} y2={ey + BAND} stroke="#1e1e1e" strokeWidth={3} strokeLinecap="round" />
              <line x1={ex2} y1={ey} x2={ex2} y2={ey + BAND} stroke="#1e1e1e" strokeWidth={3} strokeLinecap="round" />
              <text x={(ex1 + ex2) / 2} y={ey + BAND + 14} textAnchor="middle"
                    fontSize={11} fill={C.opening} fontWeight={700} letterSpacing={1.5} fontFamily={FONT}>ENTRANCE</text>
            </g>
          )
        })()}

        {/* Window — top wall (band outward, -y) */}
        {(() => {
          const wx1 = px(WIN2_X1), wx2 = px(WIN2_X2), wy = py(0)
          return (
            <g>
              <rect x={wx1} y={wy - BAND} width={wx2 - wx1} height={BAND}
                    fill="rgba(147,210,235,0.4)" stroke={C.opening} strokeWidth={1.5} />
              <line x1={(wx1 + wx2) / 2} y1={wy - BAND} x2={(wx1 + wx2) / 2} y2={wy}
                    stroke={C.opening} strokeWidth={1} />
            </g>
          )
        })()}

        {/* Window — right wall (band outward, +x) */}
        <rect x={wx} y={wy1} width={BAND} height={wy2 - wy1}
              fill="rgba(147,210,235,0.4)" stroke={C.opening} strokeWidth={1.5} />
        <line x1={wx} y1={(wy1 + wy2) / 2} x2={wx + BAND} y2={(wy1 + wy2) / 2}
              stroke={C.opening} strokeWidth={1} />

        {/* Terrace door — right wall (band outward, +x; opens to terrace) */}
        {(() => {
          const dy1 = py(TDOOR_TOP)
          const dy2 = py(TDOOR_BOT)
          const dx  = px(W_BOTTOM)
          return (
            <g>
              <line x1={dx} y1={dy1} x2={dx + BAND} y2={dy1} stroke="#1e1e1e" strokeWidth={3} strokeLinecap="round" />
              <line x1={dx} y1={dy2} x2={dx + BAND} y2={dy2} stroke="#1e1e1e" strokeWidth={3} strokeLinecap="round" />
              <path d={`M ${dx} ${dy1} A ${TDOOR_WIDTH * SCALE} ${TDOOR_WIDTH * SCALE} 0 0 1 ${dx + TDOOR_WIDTH * SCALE} ${dy2}`}
                    fill="rgba(58,124,165,0.06)" stroke={C.opening} strokeWidth={1.2} strokeDasharray="5,3" />
              <line x1={dx} y1={dy1} x2={dx + TDOOR_WIDTH * SCALE} y2={dy2}
                    stroke={C.opening} strokeWidth={1.2} />
            </g>
          )
        })()}

        {/* Bathroom door — inner 3.40m wall (opens into the bathroom, +x) */}
        {(() => {
          const bx  = px(W_TOP)
          const by1 = py(BDOOR_Y1)
          const by2 = py(BDOOR_Y2)
          return (
            <g>
              <line x1={bx} y1={by1} x2={bx + BAND} y2={by1} stroke="#1e1e1e" strokeWidth={3} strokeLinecap="round" />
              <line x1={bx} y1={by2} x2={bx + BAND} y2={by2} stroke="#1e1e1e" strokeWidth={3} strokeLinecap="round" />
              <path d={`M ${bx} ${by2} A ${BDOOR_WIDTH * SCALE} ${BDOOR_WIDTH * SCALE} 0 0 0 ${bx + BDOOR_WIDTH * SCALE} ${by1}`}
                    fill="rgba(58,124,165,0.06)" stroke={C.opening} strokeWidth={1.2} strokeDasharray="5,3" />
              <line x1={bx} y1={by2} x2={bx + BDOOR_WIDTH * SCALE} y2={by1}
                    stroke={C.opening} strokeWidth={1.2} />
            </g>
          )
        })()}

        {/* Kitchen run */}
        <Kitchen px={px} py={py} scale={SCALE} />

        {/* Couch + armchair + TV */}
        <Couch px={px} py={py} scale={SCALE} />
        <Couch px={px} py={py} scale={SCALE} data={ARMCHAIR} />
        <Tv px={px} py={py} scale={SCALE} />
        {/* Couch dimensions (axis-aligned facings only) */}
        {COUCH.facing.length <= 5 && (() => {
          const { cx, cy, w, d, facing } = COUCH
          const blue = '#566273'
          const ew = facing === 'east' || facing === 'west'
          const xH = ew ? d / 2 : w / 2
          const yH = ew ? w / 2 : d / 2
          return ew ? (
            <g>
              <VDim xm={cx + xH} y1m={cy - yH} y2m={cy + yH} label="2.10 m" side="right" gap={30} color={blue} />
              <HDim x1m={cx - xH} x2m={cx + xH} ym={cy + yH} label="0.84 m" above={false} gap={24} color={blue} />
            </g>
          ) : (
            <g>
              <HDim x1m={cx - xH} x2m={cx + xH} ym={cy + yH} label="2.10 m" above={false} gap={24} color={blue} />
              <VDim xm={cx + xH} y1m={cy - yH} y2m={cy + yH} label="0.84 m" side="right" gap={30} color={blue} />
            </g>
          )
        })()}

        {/* Dining table */}
        <DiningTable px={px} py={py} scale={SCALE} />
        {/* Dining dimensions: table w×d, chair 0.45 */}
        {(() => {
          const { cx, cy, w, d, chair } = DINING
          const southChairBot = cy + d / 2 + CHAIR_TUCK  // tucked chairs protrude only slightly
          const wood = '#8c6741'
          return (
            <g>
              {/* table width (x) */}
              <HDim x1m={cx - w / 2} x2m={cx + w / 2} ym={southChairBot} label={`${w.toFixed(2)} m`} above={false} gap={24} color={wood} />
              {/* table length (y) */}
              <VDim xm={cx - w / 2} y1m={cy - d / 2} y2m={cy + d / 2} label={`${d.toFixed(2)} m`} side="left" gap={60} color={wood} />
            </g>
          )
        })()}

        {/* Staircase — runs horizontally, ascends right */}
        {(() => {
          const x1 = px(STAIR_X1), x2 = px(STAIR_X2)
          const y1 = py(STAIR_Y1), y2 = py(STAIR_Y2)
          const nTreads = Math.round(STAIR.run / STAIR.treadDepth)
          const treads = []
          for (let i = 1; i < nTreads; i++) {
            const tx = px(STAIR_X1 + i * STAIR.treadDepth)
            treads.push(<line key={i} x1={tx} y1={y1} x2={tx} y2={y2} stroke="#9a8c74" strokeWidth={1} />)
          }
          const cyMid = (y1 + y2) / 2
          return (
            <g>
              <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1}
                    fill="rgba(154,140,116,0.12)" stroke="#7a6a52" strokeWidth={1.5} />
              {treads}
              {/* Arrow along centerline (ascends toward the left) */}
              <line x1={x2 - 10} y1={cyMid} x2={x1 + 10} y2={cyMid}
                    stroke="#7a6a52" strokeWidth={1.5} markerEnd="url(#arrow-g)" />
              <text x={x2 - 14} y={cyMid - 7} textAnchor="end"
                    fontSize={11} fontWeight={700} fill="#7a6a52" letterSpacing={1}
                    fontFamily="'Helvetica Neue',Arial,sans-serif">UP</text>
            </g>
          )
        })()}
        {/* Staircase dims: 1m gap to right wall + 1m width */}
        <HDim x1m={STAIR_X2} x2m={W_BOTTOM} ym={STAIR_Y1 + STAIR.width / 2} label="1.00 m" above color="#7a6a52" gap={26} />
        <VDim xm={STAIR_X1} y1m={STAIR_Y1} y2m={STAIR_Y2} label="1.00 m" side="left" gap={40} color="#7a6a52" />

        {/* Tie beams above the studs (overhead → subtle dashed centerline) */}
        {BEAMS.map(b => (
          <line key={b.id} x1={px(b.x)} y1={py(b.y1)} x2={px(b.x)} y2={py(b.y2)}
                stroke="#b58a52" strokeWidth={1} strokeDasharray="7,5" opacity={0.45} />
        ))}

        {/* Studs */}
        {STUDS.map(s => <Stud key={s.id} stud={s} />)}
        {STUDS.map(s => <StudDims key={s.id} stud={s} />)}

        {/* ── Wall dimensions (gray) ── */}
        <HDim x1m={0} x2m={W_TOP}    ym={0}      label="3.30 m" above gap={48} />
        <VDim xm={0}  y1m={0} y2m={H_LEFT}       label="8.10 m" side="left"  gap={70} />
        <VDim xm={W_TOP} y1m={0} y2m={STEP_Y}    label="3.10 m" side="right" gap={46} />
        <HDim x1m={W_TOP} x2m={W_BOTTOM} ym={STEP_Y} label="3.30 m" above gap={76} />
        <HDim x1m={0} x2m={W_BOTTOM}             ym={H_LEFT} label="6.60 m" above={false} gap={120} />
        <VDim xm={W_BOTTOM} y1m={STEP_Y} y2m={H_LEFT}    label="5.00 m" side="right" gap={155} />

        {/* ── Opening dimensions (blue) ── */}
        {/* Top wall window */}
        <HDim x1m={WIN2_X1} x2m={WIN2_X2}   ym={0} label={`${WIN2_WIDTH.toFixed(2)} m`} above gap={86} color={C.opening} />
        <HDim x1m={WIN2_X2} x2m={W_TOP}     ym={0} label="1.10 m" above gap={86} color={C.opening} />
        {/* Entrance segments */}
        <HDim x1m={0} x2m={ENT_LEFT}                  ym={H_LEFT} label="1.30 m" above={false} gap={62} color={C.opening} />
        <HDim x1m={ENT_LEFT} x2m={ENT_LEFT + ENT_WIDTH} ym={H_LEFT} label="3.80 m" above={false} gap={62} color={C.opening} />
        <HDim x1m={ENT_LEFT + ENT_WIDTH} x2m={W_BOTTOM} ym={H_LEFT} label="1.40 m" above={false} gap={62} color={C.opening} />
        {/* Bathroom door dims */}
        <VDim xm={W_TOP} y1m={BDOOR_Y1} y2m={BDOOR_Y2} label="0.80 m" side="right" gap={92} color={C.opening} />
        <VDim xm={W_TOP} y1m={BDOOR_Y2} y2m={STEP_Y}   label="0.80 m" side="right" gap={92} color={C.opening} />

        {/* Right wall: door + gap + window + bottom */}
        <VDim xm={W_BOTTOM} y1m={STEP_Y}     y2m={TDOOR_TOP} label={`${TERRACE_DOOR.fromTop.toFixed(2)} m`} side="right" gap={62} color={C.opening} />
        <VDim xm={W_BOTTOM} y1m={TDOOR_TOP}  y2m={TDOOR_BOT} label={`${TDOOR_WIDTH.toFixed(2)} m`}         side="right" gap={62} color={C.opening} />
        <VDim xm={W_BOTTOM} y1m={TDOOR_BOT}  y2m={STEP_Y + WIN_FROM_TOP} label={`${(STEP_Y + WIN_FROM_TOP - TDOOR_BOT).toFixed(2)} m`} side="right" gap={62} color={C.opening} />
        <VDim xm={W_BOTTOM} y1m={STEP_Y + WIN_FROM_TOP} y2m={STEP_Y + WIN_FROM_TOP + WIN_HEIGHT}  label="1.20 m" side="right" gap={62} color={C.opening} />
        <VDim xm={W_BOTTOM} y1m={STEP_Y + WIN_FROM_TOP + WIN_HEIGHT} y2m={H_LEFT}                  label="1.30 m" side="right" gap={62} color={C.opening} />

        {/* Footer */}
        <line x1={40} y1={svgH - 34} x2={svgW - 40} y2={svgH - 34} stroke="#e5e0d8" strokeWidth={1} />
        <text x={40} y={svgH - 16} fontSize={10} fill="#9ca3af" fontFamily={FONT} letterSpacing={0.4}>
          All dimensions in meters  ·  Studs 15×15 cm  ·  Walls 0.20 m  ·  A-Frame Cabin Design
        </text>
      </svg>
    </div>
  )
}
