// All measurements in meters, converted to px via SCALE
const SCALE = 90

// Outer wall dimensions
const W_TOP    = 3.30
const H_LEFT   = 8.20
const W_BOTTOM = 6.60
const H_RIGHT  = 4.80
const STEP_Y   = H_LEFT - H_RIGHT   // 4.45m
const STEP_W   = W_BOTTOM - W_TOP   // 3.30m

// Entrance
const ENT_LEFT  = 1.30
const ENT_WIDTH = 3.80

// Window on right wall: 1.30m from bottom, 1.20m tall
const WIN_HEIGHT   = 1.20
const WIN_FROM_BOT = 1.30
const WIN_FROM_TOP = H_RIGHT - WIN_FROM_BOT - WIN_HEIGHT  // derived: 4.80 - 1.30 - 1.20 = 2.30m

// Canvas layout
const MARGIN_L = 90
const MARGIN_T = 90   // room for title + top dim
const MARGIN_R = 180  // room for right wall + window dims + 3.75m
const MARGIN_B = 140  // room for entrance dims + legend

const roomW = W_BOTTOM * SCALE
const roomH = H_LEFT   * SCALE
const svgW  = MARGIN_L + roomW + MARGIN_R
const svgH  = MARGIN_T + roomH + MARGIN_B

// Room origin
const OX = MARGIN_L
const OY = MARGIN_T

// Helper: meter → px (x)
const px = m => OX + m * SCALE
const py = m => OY + m * SCALE

// L-shape polygon string
const roomPoints = [
  [0,        0      ],
  [W_TOP,    0      ],
  [W_TOP,    STEP_Y ],
  [W_BOTTOM, STEP_Y ],
  [W_BOTTOM, H_LEFT ],
  [0,        H_LEFT ],
].map(([x, y]) => `${px(x)},${py(y)}`).join(' ')

// Grid lines (1m spacing)
function Grid() {
  const lines = []
  for (let x = 1; x < W_BOTTOM; x++) {
    lines.push(<line key={`gx${x}`} x1={px(x)} y1={py(0)} x2={px(x)} y2={py(H_LEFT)} />)
  }
  for (let y = 1; y < H_LEFT; y++) {
    lines.push(<line key={`gy${y}`} x1={px(0)} y1={py(y)} x2={px(W_BOTTOM)} y2={py(y)} />)
  }
  return (
    <g clipPath="url(#roomClip)" stroke="#c8bfa9" strokeWidth={0.6} opacity={0.7}>
      {lines}
    </g>
  )
}

// Dimension: horizontal
function HDim({ x1m, x2m, ym, label, above = true, gap = 32 }) {
  const sign  = above ? -1 : 1
  const yPx   = py(ym) + sign * gap
  const x1Px  = px(x1m)
  const x2Px  = px(x2m)
  const midX  = (x1Px + x2Px) / 2
  return (
    <g stroke="#6b7280" strokeWidth={1.1} fill="#374151" fontSize={13}>
      <line x1={x1Px} y1={py(ym)} x2={x1Px} y2={yPx} stroke="#9ca3af" strokeWidth={0.8} />
      <line x1={x2Px} y1={py(ym)} x2={x2Px} y2={yPx} stroke="#9ca3af" strokeWidth={0.8} />
      <line x1={x1Px} y1={yPx} x2={x2Px} y2={yPx}
            markerStart="url(#arrowEnd)" markerEnd="url(#arrow)" />
      <rect x={midX - 22} y={yPx + (above ? -18 : 2)} width={44} height={16} fill="#fff" />
      <text x={midX} y={yPx + (above ? -5 : 14)} textAnchor="middle">{label}</text>
    </g>
  )
}

// Dimension: vertical
function VDim({ xm, y1m, y2m, label, side = 'right', gap = 40 }) {
  const sign  = side === 'right' ? 1 : -1
  const xPx   = px(xm) + sign * gap
  const y1Px  = py(y1m)
  const y2Px  = py(y2m)
  const midY  = (y1Px + y2Px) / 2
  return (
    <g stroke="#6b7280" strokeWidth={1.1} fill="#374151" fontSize={13}>
      <line x1={px(xm)} y1={y1Px} x2={xPx} y2={y1Px} stroke="#9ca3af" strokeWidth={0.8} />
      <line x1={px(xm)} y1={y2Px} x2={xPx} y2={y2Px} stroke="#9ca3af" strokeWidth={0.8} />
      <line x1={xPx} y1={y1Px} x2={xPx} y2={y2Px}
            markerStart="url(#arrowEnd)" markerEnd="url(#arrow)" />
      <rect x={xPx + (side === 'right' ? 4 : -44)} y={midY - 8} width={40} height={16} fill="#fff" />
      <text
        x={xPx + (side === 'right' ? 24 : -24)} y={midY + 5}
        textAnchor="middle"
      >{label}</text>
    </g>
  )
}

export default function FloorPlan() {
  // Entrance SVG coords (bottom wall)
  const ex1 = px(ENT_LEFT)
  const ex2 = px(ENT_LEFT + ENT_WIDTH)
  const ey  = py(H_LEFT)

  // Window SVG coords (right wall)
  const wy1 = py(STEP_Y + WIN_FROM_TOP)
  const wy2 = py(STEP_Y + WIN_FROM_TOP + WIN_HEIGHT)
  const wx  = px(W_BOTTOM)

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'2rem', background:'#f8f6f2', minHeight:'100vh' }}>
      <svg
        width={svgW} height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        style={{ background:'#fff', borderRadius:10, boxShadow:'0 4px 24px rgba(0,0,0,0.10)' }}
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke="#6b7280" strokeWidth={1.1} />
          </marker>
          <marker id="arrowEnd" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M6,0 L0,3 L6,6" fill="none" stroke="#6b7280" strokeWidth={1.1} />
          </marker>
          <clipPath id="roomClip">
            <polygon points={roomPoints} />
          </clipPath>
        </defs>

        {/* Title */}
        <text x={OX} y={MARGIN_T - 50} fontSize={17} fontWeight={600} fill="#1f2937">
          Ground Floor — Kitchen &amp; Living Room
        </text>

        {/* Floor fill */}
        <polygon points={roomPoints} fill="#f4efe6" />

        {/* Grid */}
        <Grid />

        {/* Walls — thick, drawn on top */}
        <polygon
          points={roomPoints}
          fill="none"
          stroke="#2b2b2b"
          strokeWidth={9}
          strokeLinejoin="miter"
        />

        {/* Entrance gap */}
        <line x1={ex1} y1={ey} x2={ex2} y2={ey} stroke="#fff" strokeWidth={11} />


        {/* Window on right wall */}
        <line x1={wx} y1={wy1} x2={wx} y2={wy2} stroke="#fff" strokeWidth={11} />
        <rect x={wx - 7} y={wy1} width={14} height={wy2 - wy1}
              fill="rgba(180,220,240,0.4)" stroke="#3a7ca5" strokeWidth={1.2} />
        <line x1={wx - 7} y1={(wy1 + wy2) / 2} x2={wx + 7} y2={(wy1 + wy2) / 2}
              stroke="#3a7ca5" strokeWidth={0.9} />

        {/* ── Dimensions ── */}
        {/* Top: 3.30m */}
        <HDim x1m={0} x2m={W_TOP} ym={0} label="3.30 m" above gap={36} />
        {/* Left: 8.20m */}
        <VDim xm={0} y1m={0} y2m={H_LEFT} label="8.20 m" side="left" gap={50} />

        {/* Inner step vertical: 3.40m (= 8.20 - 4.80) */}
        <VDim xm={W_TOP} y1m={0} y2m={STEP_Y} label="3.40 m" side="right" gap={36} />
        {/* Inner step horizontal: 3.50m — clamped to wall */}
        <HDim x1m={W_TOP} x2m={W_BOTTOM} ym={STEP_Y} label="3.50 m" above={false} gap={28} />

        {/* Entrance sub-dims */}
        <HDim x1m={0}                    x2m={ENT_LEFT}             ym={H_LEFT} label="1.30 m" above={false} gap={52} />
        <HDim x1m={ENT_LEFT}             x2m={ENT_LEFT + ENT_WIDTH} ym={H_LEFT} label="3.80 m" above={false} gap={52} />
        <HDim x1m={ENT_LEFT + ENT_WIDTH} x2m={W_BOTTOM}             ym={H_LEFT} label="1.40 m" above={false} gap={52} />
        {/* Entrance total */}
        <HDim x1m={0} x2m={W_BOTTOM} ym={H_LEFT} label="6.60 m" above={false} gap={100} />

        {/* Right wall total */}
        <VDim xm={W_BOTTOM} y1m={STEP_Y} y2m={H_LEFT} label="4.80 m" side="right" gap={120} />

        {/* Window dims: 1.20m opening, 1.30m from bottom */}
        <VDim xm={W_BOTTOM} y1m={STEP_Y + WIN_FROM_TOP}              y2m={STEP_Y + WIN_FROM_TOP + WIN_HEIGHT} label="1.20 m" side="right" gap={50} />
        <VDim xm={W_BOTTOM} y1m={STEP_Y + WIN_FROM_TOP + WIN_HEIGHT} y2m={H_LEFT}                             label="1.30 m" side="right" gap={50} />

        {/* Legend */}
        <text x={OX} y={svgH - 16} fontSize={11.5} fill="#4b5563">
          Total area ≈ {(W_TOP * H_LEFT + STEP_W * H_RIGHT).toFixed(1)} m²  ·  Entrance 3.80 m  ·  Window 1.20 m
        </text>
      </svg>
    </div>
  )
}
