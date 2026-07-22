import { useState, useMemo } from 'react'
import { StateData, INDIA_STATES_DATA, NATIONAL_STATS } from '../data/indiaData'

interface Props {
  onSelectState: (state: StateData) => void;
  onClose: () => void;
}

type SortField = 'name' | 'totalGdp' | 'population' | 'perCapitaIncome' | 'literacyRate' | 'area';
type SortOrder = 'asc' | 'desc';

export default function StateTableView({ onSelectState, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'state' | 'ut'>('all')
  const [sortField, setSortField] = useState<SortField>('totalGdp')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const maxGdp = 3224000;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const filteredAndSortedStates = useMemo(() => {
    return INDIA_STATES_DATA.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                            s.capital.toLowerCase().includes(search.toLowerCase()) ||
                            s.code.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterType === 'all' ? true :
                            filterType === 'ut' ? s.isUnionTerritory : !s.isUnionTerritory;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        valA = (valA as string).toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [search, filterType, sortField, sortOrder]);

  const fmtCurrency = (n: number) => `₹${(n / 1000).toFixed(1)}k Cr`;
  const fmtPerCapita = (n: number) => `₹${n.toLocaleString()}`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(9, 13, 22, 0.88)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', animation: 'popIn 0.25s ease forwards',
    }}>
      <div className="shoji-panel shoji-panel-glow" style={{
        width: '100%', maxWidth: '1200px', maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'rgba(15, 23, 42, 0.95)', borderRadius: '24px',
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '20px 32px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(30, 41, 59, 0.4)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="font-display text-gradient-sakura" style={{ fontSize: 24, fontWeight: 900 }}>
                📊 ALL STATES & UTs EXPLORER DASHBOARD
              </h2>
              <span className="font-jp" style={{ fontSize: 14, color: '#f472b6' }}>全州データ一覧</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Regional breakdown of GDP, Per Capita Income, Population, and Literacy
            </p>
          </div>
          <button onClick={onClose} className="zen-pill" style={{ padding: '8px 16px' }}>
            ✕ Close Explorer
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{
          padding: '16px 32px', background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <input
            type="text"
            className="zen-input"
            placeholder="🏮 Filter by state, capital, or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '240px' }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`zen-pill ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({INDIA_STATES_DATA.length})
            </button>
            <button
              className={`zen-pill ${filterType === 'state' ? 'active' : ''}`}
              onClick={() => setFilterType('state')}
            >
              States ({NATIONAL_STATS.totalStates})
            </button>
            <button
              className={`zen-pill ${filterType === 'ut' ? 'active' : ''}`}
              onClick={() => setFilterType('ut')}
            >
              Union Territories ({NATIONAL_STATS.totalUTs})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: 14 }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>
                <th style={thStyle} onClick={() => handleSort('name')}>State / UT {sortIndicator('name', sortField, sortOrder)}</th>
                <th style={thStyle} onClick={() => handleSort('totalGdp')}>Total GDP {sortIndicator('totalGdp', sortField, sortOrder)}</th>
                <th style={thStyle} onClick={() => handleSort('perCapitaIncome')}>Per Capita {sortIndicator('perCapitaIncome', sortField, sortOrder)}</th>
                <th style={thStyle} onClick={() => handleSort('population')}>Population {sortIndicator('population', sortField, sortOrder)}</th>
                <th style={thStyle} onClick={() => handleSort('literacyRate')}>Literacy {sortIndicator('literacyRate', sortField, sortOrder)}</th>
                <th style={thStyle} onClick={() => handleSort('area')}>Area {sortIndicator('area', sortField, sortOrder)}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedStates.map((s, idx) => {
                const gdpPct = Math.min(100, Math.round((s.totalGdp / maxGdp) * 100));
                return (
                  <tr
                    key={s.id}
                    className="shoji-panel"
                    style={{
                      borderRadius: '14px', transition: 'all 0.2s ease',
                      cursor: 'pointer', background: 'rgba(30, 41, 59, 0.4)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(244, 114, 182, 0.12)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)'}
                    onClick={() => onSelectState(s)}
                  >
                    <td style={{ ...tdStyle, borderRadius: '14px 0 0 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', width: 26 }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        <div>
                          <strong style={{ fontSize: 15, color: '#fff' }}>{s.name}</strong>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                            ({s.capital}) {s.isUnionTerritory && <span style={{ color: '#06b6d4', fontWeight: 700 }}>[UT]</span>}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div className="font-code text-gradient-matcha" style={{ fontWeight: 700 }}>
                        {fmtCurrency(s.totalGdp)}
                      </div>
                      <div style={{ width: 120, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, marginTop: 4 }}>
                        <div style={{ width: `${gdpPct}%`, height: '100%', background: 'linear-gradient(90deg, #84cc16, #a3e635)', borderRadius: 99 }} />
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span className="font-code text-gradient-amber" style={{ fontWeight: 600 }}>
                        {fmtPerCapita(s.perCapitaIncome)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span className="font-code text-gradient-sakura">{s.population} M</span>
                    </td>
                    <td style={tdStyle}>
                      <span className="font-code" style={{ color: '#c084fc' }}>{s.literacyRate}%</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: 'var(--text-muted)' }}>{s.area.toLocaleString()} sq km</span>
                    </td>
                    <td style={{ ...tdStyle, borderRadius: '0 14px 14px 0', textAlign: 'right' }}>
                      <button
                        className="zen-pill"
                        style={{ padding: '4px 12px', fontSize: 12, background: 'rgba(244, 114, 182, 0.2)', borderColor: 'rgba(244, 114, 182, 0.4)' }}
                        onClick={(e) => { e.stopPropagation(); onSelectState(s); }}
                      >
                        Inspect 📍
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function sortIndicator(field: SortField, currentField: SortField, order: SortOrder) {
  if (currentField !== field) return ' ↕'
  return order === 'asc' ? ' ▲' : ' ▼'
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  color: '#e2e8f0',
}
