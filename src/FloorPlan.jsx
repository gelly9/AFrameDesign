const SCALE = 80

// Outer wall dimensions — ground truth
const W_TOP    = 3.30
const H_LEFT   = 8.20
const W_BOTTOM = 6.60
const H_RIGHT  = 3.75

// Derived inner step (ensures flat bottom & right angle corners)
const STEP_Y = H_LEFT - H_RIGHT          // 4.45m from top
const STEP_W = W_BOTTOM - W_TOP          // 3.30m wide

// Entrance on bottom wall
const ENT_LEFT  = 1.30
const ENT_WIDTH = 3.80

// Window on right wall (3.75m total: 1.25 + 1.20 + 1.30 = 3.75 ✓)
const WIN_FROM_TOP = 1.25   // from top of right wall (STEP_Y)
const WIN_HEIGHT   = 1.20   // window opening
const WIN_FROM_BOT = 1.30   // to bottom of right wall

const PAD = 70
const OX  = PAD + 40   // extra left room for left-side dimension
const OY  = PAD

const svgW = OX + W_BOTTOM * SCALE + PAD + 60
const svgH = OY + H_LEFT  * SCALE + PAD + 50

// L-shape polygon
const pts = [
  [0,        0       ],
  [W_TOP,    0       ],
  [W_TOP,    STEP_Y  ],
  [W_BOTTOM, STEP_Y  ],
  [W_BOTTOM, H_LEFT  ],
  [0,        H_LEFT  ],
]
const pointsStr = pts.map(([x, y]) => `${OX + x * SCALE},${OY + y * SCALE}`).join(' ')

// Entrance SVG coords
const ex1 = OX + ENT_LEFT * SCALE
const ex2 = OX + (ENT_LEFT + ENT_WIDTH) * SCALE
const ey  = OY + H_LEFT * SCALE

function HDim({ x1m, x2m, ym, label, above = true, offset = 28 }) {
  const sign = above ? -1 : 1
  const yLine = OY + ym * SCALE + sign * offset
  const x1s   = OX + x1m * SCALE
  const x2s   = OX + x2m * SCALE
  return (
    <g>
      <line x1={x1s} y1={yLine} x2={x2s} y2={yLine}
            stroke="#999" strokeWidth={1}
            markerStart="url(#arr)" markerEnd="url(#arr)" />
      <line x1={x1s} y1={OY + ym * SCALE} x2={x1s} y2={yLine}
            stroke="#ccc" strokeWidth={1} strokeDasharray="3,2" />
      <line x1={x2s} y1={OY + ym * SCALE} x2={x2s} y2={yLine}
            stroke="#ccc" strokeWidth={1} strokeDasharray="3,2" />
      <text x={(x1s + x2s) / 2} y={yLine + sign * 13}
            textAnchor="middle" fontSize={11} fill="#666">{label}</text>
    </g>
  )
}

function VDim({ xm, y1m, y2m, label, side = 'left', offset = 40 }) {
  const sign = side === 'left' ? -1 : 1
  const xLine = OX + xm * SCALE
  const y1s   = OY + y1m * SCALE
  const y2s   = OY + y2m * SCALE
  const xL    = xLine + sign * offset
  return (
    <g>
      <line x1={xL} y1={y1s} x2={xL} y2={y2s}
            stroke="#999" strokeWidth={1}
            markerStart="url(#arr)" markerEnd="url(#arr)" />
      <line x1={xLine} y1={y1s} x2={xL} y2={y1s}
            stroke="#ccc" strokeWidth={1} strokeDasharray="3,2" />
      <line x1={xLine} y1={y2s} x2={xL} y2={y2s}
            stroke="#ccc" strokeWidth={1} strokeDasharray="3,2" />
      <text x={xL + sign * 4} y={(y1s + y2s) / 2}
            textAnchor={side === 'left' ? 'end' : 'start'}
            dominantBaseline="middle" fontSize={11} fill="#666">{label}</text>
    </g>
  )
}

export default function FloorPlan() {
  const area = (W_TOP * H_LEFT + STEP_W * H_RIGHT).toFixed(1)
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'2rem', gap:'1rem' }}>
      <h2 style={{ fontFamily:'system-ui', color:'#2d2d2d', fontWeight:500, letterSpacing:'-0.3px' }}>
        Ground Floor
      </h2>
      <svg width={svgW} height={svgH}
           style={{ background:'#faf9f7', borderRadius:8, boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}>
        <defs>
          <marker id="arr" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
            <polygon points="0,0 5,2.5 0,5" fill="#999" />
          </marker>
        </defs>

        {/* Floor fill */}
        <polygon points={pointsStr} fill="#ede8df" stroke="#6b5744" strokeWidth={2.5} strokeLinejoin="round" />

        {/* Window on right wall */}
        {(() => {
          const wx   = OX + W_BOTTOM * SCALE
          const wy1  = OY + (STEP_Y + WIN_FROM_TOP) * SCALE
          const wy2  = OY + (STEP_Y + WIN_FROM_TOP + WIN_HEIGHT) * SCALE
          const wThk = 6   // wall thickness visual
          return (
            <g>
              {/* erase wall line at window */}
              <line x1={wx} y1={wy1} x2={wx} y2={wy2} stroke="#faf9f7" strokeWidth={5} />
              {/* window symbol: outer lines + glass lines */}
              <rect x={wx - wThk} y={wy1} width={wThk * 2} height={wy2 - wy1}
                    fill="rgba(180,220,240,0.35)" stroke="#3a7ca5" strokeWidth={1} />
              <line x1={wx - wThk} y1={(wy1 + wy2) / 2} x2={wx + wThk} y2={(wy1 + wy2) / 2}
                    stroke="#3a7ca5" strokeWidth={0.8} />
            </g>
          )
        })()}

        {/* Entrance gap in bottom wall */}
        <line x1={ex1} y1={ey} x2={ex2} y2={ey} stroke="#faf9f7" strokeWidth={5} />

        {/* Door swing arc (inward) */}
        <path
          d={`M ${ex1} ${ey} A ${ENT_WIDTH * SCALE / 2} ${ENT_WIDTH * SCALE / 2} 0 0 1 ${ex2} ${ey}`}
          fill="rgba(58,124,165,0.08)" stroke="#3a7ca5" strokeWidth={1.5} strokeDasharray="6,3"
        />
        <line x1={ex1} y1={ey} x2={ex1} y2={ey - 14} stroke="#3a7ca5" strokeWidth={2} strokeLinecap="round" />
        <line x1={ex2} y1={ey} x2={ex2} y2={ey - 14} stroke="#3a7ca5" strokeWidth={2} strokeLinecap="round" />

        {/* === Outer wall dimensions === */}
        {/* Top: 3.30m */}
        <HDim x1m={0} x2m={W_TOP} ym={0} label="3.30 m" above />
        {/* Left: 8.20m */}
        <VDim xm={0} y1m={0} y2m={H_LEFT} label="8.20 m" side="left" />
        {/* Right wall window sub-dimensions: 1.25 / 1.20 / 1.30 */}
        <VDim xm={W_BOTTOM} y1m={STEP_Y}                          y2m={STEP_Y + WIN_FROM_TOP}                    label="1.25 m" side="right" offset={60} />
        <VDim xm={W_BOTTOM} y1m={STEP_Y + WIN_FROM_TOP}           y2m={STEP_Y + WIN_FROM_TOP + WIN_HEIGHT}       label="1.20 m" side="right" offset={60} />
        <VDim xm={W_BOTTOM} y1m={STEP_Y + WIN_FROM_TOP + WIN_HEIGHT} y2m={H_LEFT}                               label="1.30 m" side="right" offset={60} />
        {/* Right: 3.75m total */}
        <VDim xm={W_BOTTOM} y1m={STEP_Y} y2m={H_LEFT} label="3.75 m" side="right" offset={110} />
        {/* Bottom total: 6.60m */}
        <HDim x1m={0} x2m={W_BOTTOM} ym={H_LEFT} label="6.60 m" above={false} offset={48} />

        {/* === Derived inner step dimensions === */}
        {/* Inner vertical: 4.45m */}
        <VDim xm={W_TOP} y1m={0} y2m={STEP_Y} label={`${STEP_Y.toFixed(2)} m`} side="right" />
        {/* Inner horizontal: 3.30m */}
        <HDim x1m={W_TOP} x2m={W_BOTTOM} ym={STEP_Y} label={`${STEP_W.toFixed(2)} m`} above={false} offset={22} />

        {/* === Entrance dimensions === */}
        <HDim x1m={0}                   x2m={ENT_LEFT}             ym={H_LEFT} label="1.30 m" above={false} offset={28} />
        <HDim x1m={ENT_LEFT}            x2m={ENT_LEFT + ENT_WIDTH} ym={H_LEFT} label="3.80 m" above={false} offset={28} />
        <HDim x1m={ENT_LEFT + ENT_WIDTH} x2m={W_BOTTOM}            ym={H_LEFT} label="1.40 m" above={false} offset={28} />

      </svg>
      <p style={{ fontSize:12, color:'#aaa', fontFamily:'system-ui' }}>Total area ≈ {area} m²</p>
    </div>
  )
}
