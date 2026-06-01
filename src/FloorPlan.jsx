const SCALE = 95

const W_TOP    = 3.30
const H_LEFT   = 8.20
const W_BOTTOM = 6.60
const H_RIGHT  = 4.80
const STEP_Y   = H_LEFT - H_RIGHT   // 3.40m
const STEP_W   = W_BOTTOM - W_TOP   // 3.30m

const ENT_LEFT  = 1.30
const ENT_WIDTH = 3.80

// Terrace door on right wall: starts from top (STEP_Y), 1.05m
const TDOOR_WIDTH = 1.05

// Window on right wall: 1.30m from bottom, 1.20m tall
const WIN_HEIGHT   = 1.20
const WIN_FROM_BOT = 1.30
const WIN_FROM_TOP = H_RIGHT - WIN_FROM_BOT - WIN_HEIGHT  // 2.30m

// Wood stud: 15x15cm, 1.20m from right wall, centered on window
const STUD_SIZE = 0.15
const STUD_X    = W_BOTTOM - 1.20 - STUD_SIZE / 2
const STUD_Y    = H_LEFT - 2.30 - STUD_SIZE / 2

// Window on top wall (3.30m back wall): 1.10m from right, 0.70m wide
const WIN2_FROM_RIGHT = 1.10
const WIN2_WIDTH       = 0.70
const WIN2_X1          = W_TOP - WIN2_FROM_RIGHT - WIN2_WIDTH  // 1.50m
const WIN2_X2          = WIN2_X1 + WIN2_WIDTH                  // 2.20m

const MARGIN_L = 130
const MARGIN_T = 120
const MARGIN_R = 220
const MARGIN_B = 160

const roomW = W_BOTTOM * SCALE
const roomH = H_LEFT   * SCALE
const svgW  = MARGIN_L + roomW + MARGIN_R
const svgH  = MARGIN_T + roomH + MARGIN_B

const OX = MARGIN_L
const OY = MARGIN_T

const px = m => OX + m * SCALE
const py = m => OY + m * SCALE

const roomPoints = [
  [0,        0      ],
  [W_TOP,    0      ],
  [W_TOP,    STEP_Y ],
  [W_BOTTOM, STEP_Y ],
  [W_BOTTOM, H_LEFT ],
  [0,        H_LEFT ],
].map(([x, y]) => `${px(x)},${py(y)}`).join(' ')

function Grid() {
  const lines = []
  for (let x = 1; x < W_BOTTOM; x++)
    lines.push(<line key={`gx${x}`} x1={px(x)} y1={py(0)} x2={px(x)} y2={py(H_LEFT)} />)
  for (let y = 1; y < H_LEFT; y++)
    lines.push(<line key={`gy${y}`} x1={px(0)} y1={py(y)} x2={px(W_BOTTOM)} y2={py(y)} />)
  return (
    <g clipPath="url(#roomClip)" stroke="#d4cabb" strokeWidth={0.6} opacity={0.6}>
      {lines}
    </g>
  )
}

function HDim({ x1m, x2m, ym, label, above = true, gap = 32 }) {
  const sign = above ? -1 : 1
  const yL   = py(ym) + sign * gap
  const x1   = px(x1m), x2 = px(x2m), mx = (x1 + x2) / 2
  return (
    <g>
      <line x1={x1} y1={py(ym)} x2={x1} y2={yL} stroke="#b0b8c4" strokeWidth={0.8} />
      <line x1={x2} y1={py(ym)} x2={x2} y2={yL} stroke="#b0b8c4" strokeWidth={0.8} />
      <line x1={x1} y1={yL} x2={x2} y2={yL} stroke="#6b7280" strokeWidth={1.1}
            markerStart="url(#arrowEnd)" markerEnd="url(#arrow)" />
      <rect x={mx - 24} y={yL + (above ? -17 : 3)} width={48} height={15}
            fill="#fff" rx={2} />
      <text x={mx} y={yL + (above ? -5 : 13)} textAnchor="middle"
            fontSize={12} fill="#374151" fontFamily="'Helvetica Neue',Arial,sans-serif">
        {label}
      </text>
    </g>
  )
}

function VDim({ xm, y1m, y2m, label, side = 'right', gap = 40 }) {
  const sign = side === 'right' ? 1 : -1
  const xL   = px(xm) + sign * gap
  const y1   = py(y1m), y2 = py(y2m), my = (y1 + y2) / 2
  const tw   = 44
  return (
    <g>
      <line x1={px(xm)} y1={y1} x2={xL} y2={y1} stroke="#b0b8c4" strokeWidth={0.8} />
      <line x1={px(xm)} y1={y2} x2={xL} y2={y2} stroke="#b0b8c4" strokeWidth={0.8} />
      <line x1={xL} y1={y1} x2={xL} y2={y2} stroke="#6b7280" strokeWidth={1.1}
            markerStart="url(#arrowEnd)" markerEnd="url(#arrow)" />
      <rect x={xL + (side === 'right' ? 3 : -tw - 3)} y={my - 8} width={tw} height={16}
            fill="#fff" rx={2} />
      <text x={xL + (side === 'right' ? tw / 2 + 3 : -tw / 2 - 3)} y={my + 5}
            textAnchor="middle" fontSize={12} fill="#374151"
            fontFamily="'Helvetica Neue',Arial,sans-serif">
        {label}
      </text>
    </g>
  )
}

function Compass({ x, y, r = 22 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={0} cy={0} r={r} fill="#f9f8f6" stroke="#d1cfc9" strokeWidth={1} />
      <polygon points={`0,${-r + 4} ${r / 4},0 0,${r / 4} ${-r / 4},0`} fill="#374151" />
      <polygon points={`0,${r - 4} ${r / 4},0 0,${-r / 4} ${-r / 4},0`} fill="#c9c5bc" />
      <text x={0} y={-r - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#374151"
            fontFamily="'Helvetica Neue',Arial,sans-serif">N</text>
    </g>
  )
}

export default function FloorPlan() {
  const ex1 = px(ENT_LEFT)
  const ex2 = px(ENT_LEFT + ENT_WIDTH)
  const ey  = py(H_LEFT)
  const wy1 = py(STEP_Y + WIN_FROM_TOP)
  const wy2 = py(STEP_Y + WIN_FROM_TOP + WIN_HEIGHT)
  const wx  = px(W_BOTTOM)
  const area = (W_TOP * H_LEFT + STEP_W * H_RIGHT).toFixed(1)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '3rem', background: '#eeeae4', minHeight: '100vh'
    }}>
      <svg
        width={svgW} height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ background: '#fff', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.13)' }}
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3"
                  orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke="#6b7280" strokeWidth={1.1} />
          </marker>
          <marker id="arrowEnd" markerWidth="10" markerHeight="10" refX="1" refY="3"
                  orient="auto" markerUnits="userSpaceOnUse">
            <path d="M6,0 L0,3 L6,6" fill="none" stroke="#6b7280" strokeWidth={1.1} />
          </marker>
          <clipPath id="roomClip">
            <polygon points={roomPoints} />
          </clipPath>
          <filter id="wallShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#00000022" />
          </filter>
        </defs>

        {/* Title block */}
        <text x={OX} y={50} fontSize={20} fontWeight={700} fill="#1a1a2e"
              fontFamily="'Helvetica Neue',Arial,sans-serif">
          A-Frame Cabin — Ground Floor
        </text>
        <text x={OX} y={72} fontSize={13} fill="#6b7280"
              fontFamily="'Helvetica Neue',Arial,sans-serif">
          Kitchen &amp; Living Room  ·  Scale 1:100  ·  Area ≈ {area} m²
        </text>
        <line x1={OX} y1={82} x2={svgW - 40} y2={82} stroke="#e5e0d8" strokeWidth={1} />

        {/* Floor fill */}
        <polygon points={roomPoints} fill="#f0ebe0" />

        {/* Grid */}
        <Grid />


        {/* Walls with shadow */}
        <polygon points={roomPoints} fill="none" stroke="#1e1e1e" strokeWidth={10}
                 strokeLinejoin="miter" filter="url(#wallShadow)" />

        {/* Entrance gap */}
        <line x1={ex1} y1={ey} x2={ex2} y2={ey} stroke="#fff" strokeWidth={13} />
        {/* Door jambs */}
        <line x1={ex1} y1={ey - 8} x2={ex1} y2={ey + 4} stroke="#1e1e1e" strokeWidth={3} strokeLinecap="round" />
        <line x1={ex2} y1={ey - 8} x2={ex2} y2={ey + 4} stroke="#1e1e1e" strokeWidth={3} strokeLinecap="round" />
        {/* Entrance label */}
        <text x={(ex1 + ex2) / 2} y={ey - 14} textAnchor="middle"
              fontSize={11} fill="#3a7ca5" fontWeight={600}
              fontFamily="'Helvetica Neue',Arial,sans-serif">ENTRANCE</text>

        {/* Window on top wall */}
        {(() => {
          const wx1 = px(WIN2_X1), wx2 = px(WIN2_X2), wy = py(0)
          return (
            <g>
              <line x1={wx1} y1={wy} x2={wx2} y2={wy} stroke="#fff" strokeWidth={13} />
              <rect x={wx1} y={wy - 8} width={wx2 - wx1} height={16}
                    fill="rgba(147,210,235,0.35)" stroke="#3a7ca5" strokeWidth={1.5} />
              <line x1={(wx1 + wx2) / 2} y1={wy - 8} x2={(wx1 + wx2) / 2} y2={wy + 8}
                    stroke="#3a7ca5" strokeWidth={1} />
            </g>
          )
        })()}

        {/* Wood stud 15x15cm */}
        <rect
          x={px(STUD_X)} y={py(STUD_Y)}
          width={STUD_SIZE * SCALE} height={STUD_SIZE * SCALE}
          fill="#6b5744" stroke="#3d2f1f" strokeWidth={1}
        />
        {/* Hatch lines inside stud */}
        <line x1={px(STUD_X)} y1={py(STUD_Y)} x2={px(STUD_X + STUD_SIZE)} y2={py(STUD_Y + STUD_SIZE)}
              stroke="#3d2f1f" strokeWidth={0.8} />
        <line x1={px(STUD_X)} y1={py(STUD_Y + STUD_SIZE)} x2={px(STUD_X + STUD_SIZE)} y2={py(STUD_Y)}
              stroke="#3d2f1f" strokeWidth={0.8} />
        {/* Dimension: 1.20m from right wall to stud */}
        <HDim x1m={STUD_X + STUD_SIZE} x2m={W_BOTTOM} ym={STUD_Y + STUD_SIZE / 2} label="1.20 m" above gap={28} />
        {/* Dimension: 2.30m from bottom wall to stud */}
        <VDim xm={STUD_X + STUD_SIZE / 2} y1m={STUD_Y + STUD_SIZE} y2m={H_LEFT} label="2.30 m" side="left" gap={36} />

        {/* Terrace door on right wall */}
        {(() => {
          const dy1 = py(STEP_Y)
          const dy2 = py(STEP_Y + TDOOR_WIDTH)
          const dx  = px(W_BOTTOM)
          return (
            <g>
              <line x1={dx} y1={dy1} x2={dx} y2={dy2} stroke="#fff" strokeWidth={13} />
              {/* door jambs */}
              <line x1={dx - 6} y1={dy1} x2={dx + 6} y2={dy1} stroke="#1e1e1e" strokeWidth={3} strokeLinecap="round" />
              <line x1={dx - 6} y1={dy2} x2={dx + 6} y2={dy2} stroke="#1e1e1e" strokeWidth={3} strokeLinecap="round" />
              {/* door swing arc (opens outward to the right) */}
              <path
                d={`M ${dx} ${dy1} A ${TDOOR_WIDTH * SCALE} ${TDOOR_WIDTH * SCALE} 0 0 1 ${dx + TDOOR_WIDTH * SCALE} ${dy2}`}
                fill="rgba(58,124,165,0.06)" stroke="#3a7ca5" strokeWidth={1.2} strokeDasharray="5,3"
              />
              <line x1={dx} y1={dy1} x2={dx + TDOOR_WIDTH * SCALE} y2={dy2}
                    stroke="#3a7ca5" strokeWidth={1.2} />
            </g>
          )
        })()}

        {/* Window on right wall */}
        <line x1={wx} y1={wy1} x2={wx} y2={wy2} stroke="#fff" strokeWidth={13} />
        <rect x={wx - 8} y={wy1} width={16} height={wy2 - wy1}
              fill="rgba(147,210,235,0.35)" stroke="#3a7ca5" strokeWidth={1.5} />
        <line x1={wx - 8} y1={(wy1 + wy2) / 2} x2={wx + 8} y2={(wy1 + wy2) / 2}
              stroke="#3a7ca5" strokeWidth={1} />

        {/* ── Dimensions ── */}
        <HDim x1m={0} x2m={W_TOP}    ym={0}      label="3.30 m" above    gap={40} />
        {/* Top wall window dims */}
        <HDim x1m={WIN2_X1} x2m={WIN2_X2}        ym={0} label="0.70 m" above gap={76} />
        <HDim x1m={WIN2_X2} x2m={W_TOP}           ym={0} label="1.10 m" above gap={76} />
        <VDim xm={0}  y1m={0} y2m={H_LEFT}       label="8.20 m" side="left" gap={55} />
        <VDim xm={W_TOP} y1m={0} y2m={STEP_Y}    label="3.40 m" side="right" gap={38} />
        <HDim x1m={W_TOP} x2m={W_BOTTOM} ym={STEP_Y} label="3.30 m" above={false} gap={30} />
        <HDim x1m={0} x2m={ENT_LEFT}             ym={H_LEFT} label="1.30 m" above={false} gap={55} />
        <HDim x1m={ENT_LEFT} x2m={ENT_LEFT + ENT_WIDTH} ym={H_LEFT} label="3.80 m" above={false} gap={55} />
        <HDim x1m={ENT_LEFT + ENT_WIDTH} x2m={W_BOTTOM}  ym={H_LEFT} label="1.40 m" above={false} gap={55} />
        <HDim x1m={0} x2m={W_BOTTOM}             ym={H_LEFT} label="6.60 m" above={false} gap={105} />
        <VDim xm={W_BOTTOM} y1m={STEP_Y} y2m={H_LEFT}          label="4.80 m" side="right" gap={130} />
        {/* Terrace door dim */}
        <VDim xm={W_BOTTOM} y1m={STEP_Y}              y2m={STEP_Y + TDOOR_WIDTH} label="1.05 m" side="right" gap={55} />
        {/* Gap between door and window */}
        <VDim xm={W_BOTTOM} y1m={STEP_Y + TDOOR_WIDTH} y2m={STEP_Y + WIN_FROM_TOP} label="1.25 m" side="right" gap={55} />
        <VDim xm={W_BOTTOM} y1m={STEP_Y + WIN_FROM_TOP}              y2m={STEP_Y + WIN_FROM_TOP + WIN_HEIGHT} label="1.20 m" side="right" gap={55} />
        <VDim xm={W_BOTTOM} y1m={STEP_Y + WIN_FROM_TOP + WIN_HEIGHT} y2m={H_LEFT}                            label="1.30 m" side="right" gap={55} />

        {/* Compass */}
        <Compass x={svgW - 55} y={svgH - 55} />

        {/* Footer line */}
        <line x1={40} y1={svgH - 28} x2={svgW - 40} y2={svgH - 28} stroke="#e5e0d8" strokeWidth={1} />
        <text x={40} y={svgH - 12} fontSize={10} fill="#9ca3af"
              fontFamily="'Helvetica Neue',Arial,sans-serif">
          A-Frame Cabin Design  ·  Ground Floor  ·  All dimensions in meters
        </text>
      </svg>
    </div>
  )
}
