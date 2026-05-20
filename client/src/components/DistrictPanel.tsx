export default function DistrictPanel({ state, user, onClose }: any) {
  const fmt = (n: number) => `₹${n.toLocaleString()}`
  const cities = state.cities || []
  const myCities = cities.filter((d: any) => d.ownerId === user.id)
  const ownsAll = myCities.length === cities.length && cities.length > 0

  return (
    <div className="state-panel">
      <div className="sp-close" onClick={(e) => { e.stopPropagation(); onClose() }}>✕</div>

      <div className="sp-header">
        <div className="label-small accent-label">
          {state.isUnionTerritory ? 'Union Territory' : 'State'}
        </div>
        <h2 className="sp-title">{state.name}</h2>
        <div style={{ fontSize: 16, color: '#666', marginTop: 2 }}>
          {state.capital} · {state.totalDistricts} Districts
        </div>
      </div>

      <div className="sp-stats">
        <div>
          <div className="label-small">Total GDP</div>
          <div style={{ fontSize: 22, color: '#FFFF55', textShadow: '2px 2px 0 #000' }}>{fmt(state.totalGdp)} Cr</div>
        </div>
        <div>
          <div className="label-small">Your Districts</div>
          <div style={{ fontSize: 22, color: '#55FF55', textShadow: '2px 2px 0 #000' }}>{myCities.length}/{cities.length}</div>
        </div>
      </div>

      {ownsAll && (
        <div style={{ background: '#3a6e1b', borderBottom: '4px solid #2a5e0b', padding: '8px 16px', fontSize: 18, color: '#55FF55', textAlign: 'center', textShadow: '2px 2px 0 #000' }}>
          ⚡ FULL STATE BONUS - Income x5!
        </div>
      )}

      <div style={{ padding: '8px 0 4px', fontSize: 16, color: '#555' }}>Districts</div>

      <div className="district-list">
        {cities.map((d: any) => {
          const isMine = d.ownerId === user.id
          const isOther = d.ownerId && d.ownerId !== user.id
          return (
            <div
              key={d.id}
              className={`district-card ${isMine ? 'mine' : isOther ? 'other-owned' : ''}`}
              style={{ cursor: 'default' }}
            >
              <div className="dc-name">{d.name}</div>
              <div style={{ fontSize: 14, marginTop: 2 }}>
                GDP: {fmt(d.gdp)} Cr · Pop: {d.population}M
              </div>
              <div style={{ fontSize: 14, marginTop: 4 }}>
                {isMine && <span style={{ color: '#006600', fontWeight: 'bold' }}>✓ You own this</span>}
                {isOther && <span style={{ color: '#660000' }}>Owned by {d.owner?.username}</span>}
                {!d.ownerId && <span style={{ color: '#886600' }}>Unowned · {fmt(d.basePrice)} Cr</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
