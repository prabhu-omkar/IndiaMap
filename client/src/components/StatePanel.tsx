import { useEffect, useRef, useState } from 'react'
import { StateData, INDIA_STATES_DATA, NATIONAL_STATS } from '../data/indiaData'
import { STATE_TERRAIN, TERRAIN_INFO } from '../data/terrainData'

interface Props {
  state: StateData
  onClose: () => void
}

/* ── Constants ───────────────────────────────────────────────── */
const MAX_GDP = 3224000
const MAX_POP = 220
const MAX_INC = 600000
const AVG_LIT = 74.04     // approx India avg literacy

const AVG_GDP = Math.round(NATIONAL_STATS.totalGdp / INDIA_STATES_DATA.length)
const AVG_POP = Number((NATIONAL_STATS.totalPopulation / INDIA_STATES_DATA.length).toFixed(1))
const AVG_INC = NATIONAL_STATS.avgPerCapitaIncome
const TOTAL   = INDIA_STATES_DATA.length

function fmtGdp(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L Cr`
  return `₹${(n / 1000).toFixed(0)}k Cr`
}

/* ── Animated Donut Ring ─────────────────────────────────────── */
function DonutRing({ pct, size = 88, stroke = 9, color, trackColor = '#ede8e0',
  label, value, sub }: {
  pct: number; size?: number; stroke?: number; color: string
  trackColor?: string; label: string; value: string; sub?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const [filled, setFilled] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setFilled(pct), 60)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${(filled/100)*circ} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)' }}
        />
        <text x={size/2} y={size/2 - (sub ? 4 : 1)} textAnchor="middle"
          fontSize={size < 80 ? 13 : 15} fontWeight={800} fill={color}
          fontFamily="'Space Grotesk',sans-serif">
          {value}
        </text>
        {sub && (
          <text x={size/2} y={size/2 + 11} textAnchor="middle"
            fontSize={8.5} fill="#a8a29e" fontFamily="'Inter',sans-serif">
            {sub}
          </text>
        )}
      </svg>
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.5px',
        textTransform: 'uppercase', color: 'var(--dim)', fontFamily: "'Space Grotesk',sans-serif" }}>
        {label}
      </span>
    </div>
  )
}

/* ── Half-Arc Per Capita Gauge ───────────────────────────────── */
function HalfGauge({ pct, color, value }: { pct: number; color: string; value: string }) {
  const W = 170, cy = 88, r = 68, cx = W / 2
  const half = Math.PI * r
  const [filled, setFilled] = useState(0)
  useEffect(() => { const t = setTimeout(() => setFilled(pct), 80); return () => clearTimeout(t) }, [pct])
  const dashFill = (filled / 100) * half

  // Needle angle
  const angle = Math.PI - (filled / 100) * Math.PI
  const nx = cx + r * Math.cos(angle)
  const ny = cy - r * Math.sin(angle)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={W} height={105} viewBox={`0 0 ${W} 105`} overflow="visible">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#ede8e0" strokeWidth={11} strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth={11} strokeLinecap="round"
          strokeDasharray={`${dashFill} ${half}`}
          style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)' }}
        />
        {/* Needle dot */}
        {filled > 1 && (
          <circle cx={nx} cy={ny} r={6} fill="#fff" stroke={color} strokeWidth={2.5}
            style={{ transition: 'cx 1.1s cubic-bezier(0.16,1,0.3,1), cy 1.1s cubic-bezier(0.16,1,0.3,1)' }}
          />
        )}
        {/* Value */}
        <text x={cx} y={cy - 14} textAnchor="middle"
          fontSize={22} fontWeight={900} fill={color} fontFamily="'Space Grotesk',sans-serif">
          {value}
        </text>
        <text x={cx} y={cy + 2} textAnchor="middle"
          fontSize={9.5} fill="#a8a29e">per year, per capita</text>
        <text x={cx - r + 2} y={cy + 18} textAnchor="middle" fontSize={9} fill="#c5bfb7" fontWeight={600}>₹50k</text>
        <text x={cx + r - 2} y={cy + 18} textAnchor="middle" fontSize={9} fill="#c5bfb7" fontWeight={600}>₹6L+</text>
      </svg>
      <span className="section-label">Per Capita Income</span>
    </div>
  )
}

/* ── Animated Comparative Bar ────────────────────────────────── */
function CompBar({ value, max, avg, color, label, formatted, avgLabel }: {
  value: number; max: number; avg: number; color: string
  label: string; formatted: string; avgLabel: string
}) {
  const pct    = Math.min(100, (value / max) * 100)
  const avgPct = Math.min(100, (avg   / max) * 100)
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(pct), 100); return () => clearTimeout(t) }, [pct])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
        <span className="section-label">{label}</span>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 14, color }}>{formatted}</span>
      </div>
      <div className="bar-track" style={{ height: 8, position: 'relative' }}>
        <div className="bar-fill" style={{ width: `${w}%`, height: '100%', background: `linear-gradient(90deg, ${color}66, ${color})`, borderRadius: 99 }} />
        {/* National avg line */}
        <div style={{
          position: 'absolute', top: -6, bottom: -6, width: 2,
          left: `${avgPct}%`, background: 'rgba(0,0,0,0.2)', borderRadius: 2,
        }} />
        <div style={{
          position: 'absolute', top: -19, left: `${avgPct}%`, transform: 'translateX(-50%)',
          fontSize: 8.5, color: 'var(--dim)', whiteSpace: 'nowrap', fontWeight: 600,
        }}>
          ø {avgLabel}
        </div>
      </div>
    </div>
  )
}

/* ── National Rank Badge ─────────────────────────────────────── */
function RankBadge({ rank, label, color, total }: { rank: number; label: string; color: string; total: number }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '11px 8px', borderRadius: 12,
      background: rank <= 3 ? `${color}10` : '#faf9f7',
      border: `1px solid ${rank <= 3 ? color + '35' : 'var(--border)'}`,
      flex: 1,
    }}>
      {medal ? (
        <span style={{ fontSize: 18 }}>{medal}</span>
      ) : (
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 900, fontSize: 18, color }}>
          #{rank}
        </span>
      )}
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--dim)', textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </span>
      <span style={{ fontSize: 8.5, color: 'var(--dim)' }}>of {total}</span>
    </div>
  )
}

/* ── Radar / Spider Chart ─────────────────────────────────────── */
function RadarChart({ state }: { state: StateData }) {
  const W = 200, H = 180, cx = W / 2, cy = H / 2 + 4, maxR = 62
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame: number
    const start = performance.now()
    const duration = 900
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setProgress(1 - Math.pow(1 - t, 3))
      if (t < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [state.code])

  const axes = [
    { label: 'GDP',       angle: -Math.PI / 2, val: state.totalGdp / MAX_GDP,      avg: AVG_GDP / MAX_GDP,      color: '#059669' },
    { label: 'Pop',       angle: 0,            val: state.population / MAX_POP,     avg: AVG_POP / MAX_POP,      color: '#0284c7' },
    { label: 'Literacy',  angle: Math.PI / 2,  val: state.literacyRate / 100,       avg: AVG_LIT / 100,          color: '#7c3aed' },
    { label: 'Income',    angle: Math.PI,      val: state.perCapitaIncome / MAX_INC, avg: AVG_INC / MAX_INC,     color: '#d97706' },
  ]

  const pts = (values: number[]) =>
    axes.map((a, i) => {
      const r = values[i] * maxR * progress
      return [cx + r * Math.cos(a.angle), cy + r * Math.sin(a.angle)] as [number, number]
    })

  const statePts = pts(axes.map(a => a.val))
  const avgPts   = pts(axes.map(a => a.avg))

  const toPath = (points: [number, number][]) =>
    `M ${points.map(p => p.join(',')).join(' L ')} Z`

  // Label offsets based on angle
  const labelPos = (a: typeof axes[0]) => {
    const pad = maxR + 16
    return [cx + pad * Math.cos(a.angle), cy + pad * Math.sin(a.angle)]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Grid rings */}
        {[0.25, 0.5, 0.75, 1.0].map(t => (
          <polygon key={t}
            points={axes.map(a => {
              const r = t * maxR
              return `${cx + r * Math.cos(a.angle)},${cy + r * Math.sin(a.angle)}`
            }).join(' ')}
            fill="none" stroke="#e8e4dd" strokeWidth={t === 1.0 ? 1.5 : 0.8}
          />
        ))}

        {/* Axis lines */}
        {axes.map((a, i) => (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + maxR * Math.cos(a.angle)} y2={cy + maxR * Math.sin(a.angle)}
            stroke="#ddd8d0" strokeWidth={1}
          />
        ))}

        {/* National avg polygon */}
        <path d={toPath(avgPts)}
          fill="rgba(100,116,139,0.12)" stroke="rgba(100,116,139,0.45)"
          strokeWidth={1.5} strokeDasharray="4 3"
        />

        {/* State polygon */}
        <path d={toPath(statePts)}
          fill="rgba(5,150,105,0.14)" stroke="#059669"
          strokeWidth={2} strokeLinejoin="round"
        />

        {/* Data point circles */}
        {statePts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={4.5}
            fill="#fff" stroke={axes[i].color} strokeWidth={2}
          />
        ))}

        {/* Axis labels */}
        {axes.map((a, i) => {
          const [lx, ly] = labelPos(a)
          return (
            <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
              fontSize={9.5} fontWeight={700} fill={a.color}
              fontFamily="'Space Grotesk',sans-serif">
              {a.label}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, fontSize: 10, color: 'var(--dim)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 16, height: 2, background: '#059669', borderRadius: 99 }} />
          <span>This state</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 16, height: 1, background: '#94a3b8', borderRadius: 99, borderTop: '1px dashed #94a3b8' }} />
          <span>National avg</span>
        </div>
      </div>
    </div>
  )
}

/* ── GDP Share of India visual ───────────────────────────────── */
function GdpShareBar({ state }: { state: StateData }) {
  const sharePct = (state.totalGdp / NATIONAL_STATS.totalGdp) * 100
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(sharePct), 150); return () => clearTimeout(t) }, [sharePct])

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12,
      background: '#f5f9f6', border: '1px solid rgba(5,150,105,0.2)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span className="section-label">Share of India's GDP</span>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 15, color: '#059669' }}>
          {sharePct.toFixed(1)}%
        </span>
      </div>
      {/* Full-width bar representing 100% of India's GDP */}
      <div style={{ position: 'relative', height: 10, background: '#e5e7e5', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          width: `${w}%`, height: '100%', borderRadius: 99,
          background: 'linear-gradient(90deg, #6aaa5066, #059669)',
          transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 5 }}>
        {fmtGdp(state.totalGdp)} of {fmtGdp(NATIONAL_STATS.totalGdp)} India total
      </div>
    </div>
  )
}

/* ── Main Panel ─────────────────────────────────────────────── */
export default function StatePanel({ state, onClose }: Props) {
  const popPct   = Math.min(100, (state.population / MAX_POP) * 100)
  const litPct   = state.literacyRate
  const incPct   = Math.round(Math.min(100, (state.perCapitaIncome / MAX_INC) * 100))
  const density  = Math.round((state.population * 1e6) / state.area)

  // Compute national ranks (sort descending = higher is better)
  const rank = (key: keyof StateData) =>
    [...INDIA_STATES_DATA].sort((a, b) => (b[key] as number) - (a[key] as number))
      .findIndex(s => s.code === state.code) + 1

  const gdpRank = rank('totalGdp')
  const popRank = rank('population')
  const litRank = rank('literacyRate')
  const incRank = rank('perCapitaIncome')

  return (
    <aside
      className="glass-hi anim-slide-in no-select state-panel"
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'var(--panel-w)', zIndex: 30,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderLeft: '1px solid var(--border-hi)',
        background: 'rgba(255,255,255,0.97)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        padding: '20px 20px 16px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, position: 'relative',
      }}>
        {/* Close button — absolutely fixed, never shifts */}
        <button className="icon-btn" onClick={onClose}
          style={{ position: 'absolute', top: 18, right: 18 }}>
          ✕
        </button>

        <div style={{ marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: 700,
            background: state.isUnionTerritory ? '#eff6ff' : '#f0fdf4',
            border: `1px solid ${state.isUnionTerritory ? '#bfdbfe' : '#bbf7d0'}`,
            color: state.isUnionTerritory ? '#1d4ed8' : '#15803d',
          }}>
            {state.isUnionTerritory ? '🔷 Union Territory' : '🌿 Indian State'}
          </span>
          {(() => {
            const terrain = STATE_TERRAIN[state.code]
            const info = terrain ? TERRAIN_INFO[terrain] : null
            return info ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: 700,
                background: `${info.topColor}22`,
                border: `1px solid ${info.topColor}55`,
                color: 'var(--muted)',
              }}>
                {info.icon} {info.label}
              </span>
            ) : null
          })()}
        </div>

        <h2 style={{
          fontSize: 23, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1,
          paddingRight: 44, fontFamily: "'Space Grotesk',sans-serif",
        }}>
          {state.name}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>
          🏛 {state.capital} &nbsp;·&nbsp;
          <span style={{ fontWeight: 600, color: 'var(--stone)' }}>{state.code}</span>
          &nbsp;·&nbsp; {state.area.toLocaleString()} km²
        </p>
      </div>

      {/* ── Scrollable Body ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ① National rank badges */}
        <section>
          <span className="section-label" style={{ display: 'block', marginBottom: 10 }}>National Ranking</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <RankBadge rank={gdpRank}  label="GDP"       color="#059669" total={TOTAL} />
            <RankBadge rank={popRank}  label="Population" color="#0284c7" total={TOTAL} />
            <RankBadge rank={litRank}  label="Literacy"   color="#7c3aed" total={TOTAL} />
            <RankBadge rank={incRank}  label="Per Capita" color="#d97706" total={TOTAL} />
          </div>
        </section>

        {/* ② Radar chart — 4D comparison vs national avg */}
        <section style={{
          background: '#faf9f7', borderRadius: 14,
          border: '1px solid var(--border)', padding: '14px 10px 10px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <span className="section-label" style={{ marginBottom: 8 }}>4-Dimension Profile vs National Average</span>
          <RadarChart state={state} />
        </section>

        {/* ③ Three donuts: Literacy + GDP rank % + Population */}
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <DonutRing pct={litPct}  color="#7c3aed" value={`${litPct}%`}        label="Literacy" size={82} stroke={8} />
            <DonutRing pct={Math.round(Math.min(100,(state.totalGdp/MAX_GDP)*100))} color="#059669"
              value={`${Math.round((state.totalGdp/MAX_GDP)*100)}%`} sub="of max" label="GDP Rank" size={82} stroke={8} />
            <DonutRing pct={Math.round(popPct)} color="#0284c7"
              value={`${state.population}M`} label="Population" size={82} stroke={8} />
          </div>
        </section>

        {/* ④ GDP share of India */}
        <GdpShareBar state={state} />

        {/* ⑤ Population comparative bar */}
        <section style={{ paddingTop: 8 }}>
          <span className="section-label" style={{ display: 'block', marginBottom: 16 }}>Compared to all states</span>
          <CompBar
            value={state.population} max={MAX_POP} avg={AVG_POP}
            color="#0284c7" label="Population"
            formatted={`${state.population}M`} avgLabel={`${AVG_POP}M`}
          />
        </section>

        {/* ⑥ Per Capita half-gauge */}
        <section style={{
          background: '#fdf9f4', borderRadius: 14,
          border: '1px solid rgba(217,119,6,0.15)', padding: '16px 12px 12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <HalfGauge
            pct={incPct}
            color="#d97706"
            value={`₹${(state.perCapitaIncome / 1000).toFixed(0)}k`}
          />
        </section>

        {/* ⑦ Density + Area quick stat tiles */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{
            padding: '13px', borderRadius: 11, background: '#faf9f7',
            border: '1px solid var(--border)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--stone)',
              fontFamily: "'Space Grotesk',sans-serif" }}>
              {density.toLocaleString()}
            </div>
            <div className="section-label" style={{ marginTop: 3 }}>people / km²</div>
          </div>
          <div style={{
            padding: '13px', borderRadius: 11, background: '#faf9f7',
            border: '1px solid var(--border)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--dirt)',
              fontFamily: "'Space Grotesk',sans-serif" }}>
              {(state.area / 1000).toFixed(0)}k
            </div>
            <div className="section-label" style={{ marginTop: 3 }}>km² total area</div>
          </div>
        </section>

      </div>

      {/* ── Bottom gradient bar ─────────────────────────────── */}
      <div style={{
        height: 4, flexShrink: 0,
        background: 'linear-gradient(90deg, #3d7a2a, #059669, #0284c7, #7c3aed, #d97706)',
      }} />
    </aside>
  )
}
