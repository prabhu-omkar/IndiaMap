import { StateData } from '../data/indiaData'

interface Props {
  data: { state: StateData; x: number; y: number }
}

function fmtGdp(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L Cr`
  return `₹${(n / 1000).toFixed(0)}k Cr`
}

export default function HoverTooltip({ data }: Props) {
  const { state, x, y } = data
  const left = Math.min(x + 16, window.innerWidth - 230)
  const top  = Math.min(y + 12, window.innerHeight - 120)

  return (
    <div
      className="tooltip glass-hi"
      style={{ left, top, minWidth: 190, padding: '11px 15px', borderRadius: 14 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 7 }}>
        <span style={{ fontWeight: 800, fontSize: 14, fontFamily: "'Space Grotesk',sans-serif", color: 'var(--text)' }}>
          {state.name}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif",
          background: state.isUnionTerritory ? '#eff6ff' : '#f0fdf4',
          color: state.isUnionTerritory ? '#1d4ed8' : '#15803d',
          padding: '2px 8px', borderRadius: 6,
          border: `1px solid ${state.isUnionTerritory ? '#bfdbfe' : '#bbf7d0'}`,
        }}>
          {state.code}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 9 }}>
        Capital: {state.capital}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>GDP</div>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#059669', fontFamily: "'Space Grotesk',sans-serif" }}>
            {fmtGdp(state.totalGdp)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Pop</div>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#0284c7', fontFamily: "'Space Grotesk',sans-serif" }}>
            {state.population}M
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Lit.</div>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#7c3aed', fontFamily: "'Space Grotesk',sans-serif" }}>
            {state.literacyRate}%
          </div>
        </div>
      </div>
    </div>
  )
}
