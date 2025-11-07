import { HeatmapMode } from '../App'

interface Props {
  mode: HeatmapMode
  onMode: (m: HeatmapMode) => void
}

const VISUALIZER_MODES: { key: HeatmapMode; label: string; color: string; lo: string; hi: string }[] = [
  { key: 'gdp',        label: 'GDP',        color: '#059669', lo: 'Low GDP',         hi: 'High GDP' },
  { key: 'population', label: 'Population', color: '#0284c7', lo: 'Low Population',  hi: 'High Population' },
  { key: 'perCapita',  label: 'Per Capita', color: '#d97706', lo: 'Low Income',      hi: 'High Income' },
  { key: 'literacy',   label: 'Literacy',   color: '#7c3aed', lo: 'Low Literacy',    hi: 'High Literacy' },
]

const GRAD: Record<HeatmapMode, string> = {
  none:       '',
  gdp:        'linear-gradient(90deg, #c8d5b9, #2d6a1f)',
  population: 'linear-gradient(90deg, #bfd7ea, #0c4a87)',
  perCapita:  'linear-gradient(90deg, #f5e6c8, #92400e)',
  literacy:   'linear-gradient(90deg, #f3e8ff, #4c1d95)',
}

export default function MapControls({ mode, onMode }: Props) {
  const activeVisMode = VISUALIZER_MODES.find(m => m.key === mode)

  return (
    <div className="glass no-select"
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        borderRadius: 20, padding: '10px 16px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Gradient color legend when in visualizer mode */}
      {mode !== 'none' && activeVisMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', paddingBottom: 6, borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 600 }}>
            {activeVisMode.lo}
          </span>
          <div style={{
            flex: 1, height: 6, borderRadius: 99,
            background: GRAD[mode], border: '1px solid var(--border)',
          }} />
          <span style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 600 }}>
            {activeVisMode.hi}
          </span>
        </div>
      )}

      {/* Control Pills */}
      <div className="mode-pills-wrap" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Main Highlight: Normal Mode */}
        <button
          className={`pill ${mode === 'none' ? 'active' : ''}`}
          onClick={() => onMode('none')}
          style={mode === 'none' ? { background: '#3d7a2a', borderColor: '#3d7a2a', color: '#fff' } : {}}
        >
          Normal
        </button>

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: 'var(--border-hi)', margin: '0 4px' }} />

        {/* Visualizer Modes */}
        <div style={{ display: 'flex', gap: 5 }}>
          {VISUALIZER_MODES.map(m => (
            <button key={m.key}
              className={`pill ${mode === m.key ? 'active' : ''}`}
              onClick={() => onMode(m.key)}
              style={mode === m.key ? { background: m.color, borderColor: m.color, color: '#fff' } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
