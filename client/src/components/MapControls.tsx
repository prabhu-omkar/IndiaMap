import { NATIONAL_STATS } from '../data/indiaData'
import { TERRAIN_INFO } from '../data/terrainData'
import { HeatmapMode } from '../App'

interface Props {
  mode: HeatmapMode
  onMode: (m: HeatmapMode) => void
}

const MODES: { key: HeatmapMode; label: string; icon: string; color: string; lo: string; hi: string }[] = [
  { key: 'none',       label: 'Terrain',    icon: '🌍', color: '#3d7a2a', lo: '',        hi: '' },
  { key: 'gdp',        label: 'GDP',        icon: '📊', color: '#059669', lo: 'Low',    hi: '₹32L Cr' },
  { key: 'population', label: 'Population', icon: '👥', color: '#0284c7', lo: 'Sparse', hi: '220M+' },
  { key: 'perCapita',  label: 'Per Capita', icon: '💰', color: '#d97706', lo: '₹50k',   hi: '₹6L+' },
  { key: 'literacy',   label: 'Literacy',   icon: '📚', color: '#7c3aed', lo: 'Low',    hi: '100%' },
]

const GRAD: Record<HeatmapMode, string> = {
  none:       '',
  gdp:        'linear-gradient(90deg, #c8d5b9, #2d6a1f)',
  population: 'linear-gradient(90deg, #bfd7ea, #0c4a87)',
  perCapita:  'linear-gradient(90deg, #f5e6c8, #92400e)',
  literacy:   'linear-gradient(90deg, #f3e8ff, #4c1d95)',
}

// Terrain type legend items
const TERRAIN_LEGEND = [
  { label: 'Snow Mountains',  icon: '🏔️', color: '#c4d4de' },
  { label: 'Hills',           icon: '⛰️', color: '#5a8060' },
  { label: 'Desert',          icon: '🏜️', color: '#d4a96a' },
  { label: 'Coastal',         icon: '🌴', color: '#3d9970' },
  { label: 'Plains',          icon: '🌾', color: '#6aaa50' },
  { label: 'Plateau',         icon: '🗻', color: '#c47d4a' },
  { label: 'Forest',          icon: '🌲', color: '#3d6e30' },
  { label: 'Metro',           icon: '🏙️', color: '#909498' },
]

function fmtCr(n: number) {
  if (n >= 1e7) return `₹${(n/1e7).toFixed(1)}L Cr`
  return `₹${n.toLocaleString()} Cr`
}

export default function MapControls({ mode, onMode }: Props) {
  const activeMode = MODES.find(m => m.key === mode)!

  return (
    <>
      {/* ── National stats + brand — top center ────────────── */}
      <div className="glass no-select stats-ribbon"
        style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, display: 'flex', alignItems: 'center', gap: 0,
          borderRadius: 99, overflow: 'hidden', boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Brand */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          borderRight: '1px solid var(--border)',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, #3d7a2a, #6aaa50)',
            display: 'grid', placeItems: 'center', fontSize: 13,
          }}>🌿</div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '-0.3px',
              fontFamily: "'Space Grotesk',sans-serif", color: 'var(--text)', lineHeight: 1 }}>
              IndiaMap
            </div>
            <div style={{ fontSize: 8.5, color: 'var(--dim)', fontWeight: 600,
              letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              3D Visualiser
            </div>
          </div>
        </div>

        {/* Stats */}
        {[
          { label: 'GDP',        value: fmtCr(NATIONAL_STATS.totalGdp),          color: '#059669' },
          { label: 'Population', value: `${NATIONAL_STATS.totalPopulation}M`,    color: '#0284c7' },
          { label: 'States+UTs', value: `${NATIONAL_STATS.totalStates}+${NATIONAL_STATS.totalUTs}`, color: '#7c3aed' },
          { label: 'Avg Literacy', value: `74%`, color: '#d97706' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '7px 15px', borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ fontSize: 8.5, color: 'var(--dim)', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {s.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: s.color,
              fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1.2, marginTop: 1 }}>
              {s.value}
            </div>
          </div>
        ))}

        <div style={{ padding: '7px 14px', fontSize: 11, color: 'var(--dim)', fontStyle: 'italic' }}>
          Click any state
        </div>
      </div>

      {/* ── Mode switcher + legend — bottom center ──────────── */}
      <div className="glass no-select"
        style={{
          position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          borderRadius: 20, padding: '12px 14px 10px',
          boxShadow: 'var(--shadow-md)', minWidth: 380,
        }}
      >
        {/* Terrain mode legend grid */}
        {mode === 'none' && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center',
            paddingBottom: 8, borderBottom: '1px solid var(--border)',
            width: '100%',
          }}>
            {TERRAIN_LEGEND.map(t => (
              <div key={t.label} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 9.5, color: 'var(--muted)', fontWeight: 600,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                {t.icon} {t.label}
              </div>
            ))}
          </div>
        )}

        {/* Gradient color legend for data modes */}
        {mode !== 'none' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', paddingBottom: 8, borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 9.5, color: 'var(--dim)', fontWeight: 700 }}>
              {activeMode.lo}
            </span>
            <div style={{
              flex: 1, height: 7, borderRadius: 99,
              background: GRAD[mode], border: '1px solid var(--border)',
            }} />
            <span style={{ fontSize: 9.5, color: 'var(--dim)', fontWeight: 700 }}>
              {activeMode.hi}
            </span>
            <span style={{ fontSize: 9, color: 'var(--dim)', fontStyle: 'italic', marginLeft: 2 }}>
              (height + color)
            </span>
          </div>
        )}

        {/* Pills */}
        <div className="mode-pills-wrap" style={{ display: 'flex', gap: 5 }}>
          {MODES.map(m => (
            <button key={m.key}
              className={`pill ${mode === m.key ? 'active' : ''}`}
              onClick={() => onMode(m.key)}
              style={mode === m.key ? { background: m.color, borderColor: m.color } : {}}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
