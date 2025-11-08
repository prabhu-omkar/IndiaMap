import { StateData } from '../data/indiaData'

interface Props {
  state: StateData;
  onClose: () => void;
}

export default function DistrictPanel({ state, onClose }: Props) {
  const fmtCurrency = (n: number) => `₹${(n / 1000).toFixed(1)}k Cr`;
  const fmtPerCapita = (n: number) => `₹${n.toLocaleString()}/yr`;
  const cities = state.cities || []

  const maxGdp = 3224000;
  const gdpPct = Math.min(100, Math.round((state.totalGdp / maxGdp) * 100));
  const pcPct = Math.min(100, Math.round((state.perCapitaIncome / 550000) * 100));

  return (
    <aside
      className="shoji-panel animate-pop-in"
      style={{
        position: 'fixed', top: 96, right: 24, bottom: 24, width: '420px', zIndex: 850,
        padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px',
        borderRadius: '24px', background: 'rgba(15, 23, 42, 0.86)', border: '1px solid rgba(244, 114, 182, 0.35)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(244, 114, 182, 0.15)',
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
      >
        ✕
      </button>

      {/* Hero Header with Kanji Badges */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{
            background: state.isUnionTerritory ? 'rgba(6, 182, 212, 0.15)' : 'rgba(244, 114, 182, 0.15)',
            color: state.isUnionTerritory ? '#06b6d4' : '#f472b6',
            border: `1px solid ${state.isUnionTerritory ? 'rgba(6, 182, 212, 0.4)' : 'rgba(244, 114, 182, 0.4)'}`,
            padding: '3px 10px', borderRadius: '9999px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase'
          }}>
            {state.isUnionTerritory ? '連邦直轄領 (UT)' : '州 (State)'}
          </span>
          <span className="font-code" style={{ fontSize: 12, color: 'var(--text-muted)' }}>ISO: {state.code}</span>
        </div>

        <h2 className="font-display text-gradient-sakura" style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.1 }}>
          {state.name}
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>
          Capital City: <strong style={{ color: '#fff' }}>{state.capital}</strong>
        </p>
      </div>

      {/* Main Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="shoji-panel" style={{ padding: '14px', borderRadius: '16px', background: 'rgba(30, 41, 59, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700 }}>
            <span>国内総生産</span>
            <span>GDP</span>
          </div>
          <div className="font-code text-gradient-matcha" style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
            {fmtCurrency(state.totalGdp)}
          </div>
          <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, marginTop: 10 }}>
            <div style={{ width: `${gdpPct}%`, height: '100%', background: 'linear-gradient(90deg, #84cc16, #a3e635)', borderRadius: 99 }} />
          </div>
        </div>

        <div className="shoji-panel" style={{ padding: '14px', borderRadius: '16px', background: 'rgba(30, 41, 59, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700 }}>
            <span>一人当たり</span>
            <span>INCOME</span>
          </div>
          <div className="font-code text-gradient-amber" style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>
            {fmtPerCapita(state.perCapitaIncome)}
          </div>
          <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, marginTop: 10 }}>
            <div style={{ width: `${pcPct}%`, height: '100%', background: 'linear-gradient(90deg, #fbbf24, #fde047)', borderRadius: 99 }} />
          </div>
        </div>

        <div className="shoji-panel" style={{ padding: '14px', borderRadius: '16px', background: 'rgba(30, 41, 59, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700 }}>
            <span>人口</span>
            <span>POPULATION</span>
          </div>
          <div className="font-code text-gradient-sakura" style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            {state.population} Million
          </div>
        </div>

        <div className="shoji-panel" style={{ padding: '14px', borderRadius: '16px', background: 'rgba(30, 41, 59, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700 }}>
            <span>識字率</span>
            <span>LITERACY</span>
          </div>
          <div className="font-code" style={{ fontSize: 18, fontWeight: 700, color: '#c084fc', marginTop: 2 }}>
            {state.literacyRate}%
          </div>
        </div>
      </div>

      {/* Demographics Card */}
      <div className="shoji-panel" style={{
        padding: '12px 16px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between',
        fontSize: 13, color: 'var(--text-muted)', background: 'rgba(30, 41, 59, 0.3)'
      }}>
        <span>📏 面積 (Area): <strong style={{ color: '#fff' }}>{state.area.toLocaleString()} sq km</strong></span>
        <span>👥 密度 (Density): <strong style={{ color: '#fff' }}>{Math.round((state.population * 1000000) / state.area)} / sq km</strong></span>
      </div>

      {/* Key Economic Industries */}
      {state.industries && state.industries.length > 0 && (
        <div>
          <h4 style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            主要産業 (Key Industries)
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {state.industries.map((ind, i) => (
              <span key={i} style={{
                background: 'rgba(244, 114, 182, 0.12)', color: '#f472b6',
                border: '1px solid rgba(244, 114, 182, 0.3)',
                borderRadius: '9999px', padding: '4px 12px', fontSize: 12, fontWeight: 600
              }}>
                ⚡ {ind}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Major District / City Breakdown */}
      <div>
        <h4 style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          主要都市 (Major District Hubs - {cities.length})
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {cities.map((d) => (
            <div
              key={d.id}
              className="shoji-panel"
              style={{
                borderRadius: '12px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', background: 'rgba(30, 41, 59, 0.3)', border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{d.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Pop: {d.population}M</div>
              </div>
              <div className="font-code text-gradient-matcha" style={{ fontSize: 14, fontWeight: 700 }}>
                ₹{d.gdp.toLocaleString()} Cr
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
