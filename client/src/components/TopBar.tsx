import { useState, useRef, useEffect } from 'react'
import { StateData, INDIA_STATES_DATA, NATIONAL_STATS } from '../data/indiaData'

export type HeatmapMode = 'none' | 'gdp' | 'population' | 'perCapita';

interface Props {
  heatmapMode: HeatmapMode;
  onSelectHeatmapMode: (mode: HeatmapMode) => void;
  onSelectState: (state: StateData) => void;
  onToggleTableView: () => void;
}

export default function TopBar({
  heatmapMode,
  onSelectHeatmapMode,
  onSelectState,
  onToggleTableView,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredStates = searchQuery.trim() ? INDIA_STATES_DATA.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.capital.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5) : []

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fmtCurrency = (n: number) => `₹${(n / 100000).toFixed(2)}L Cr`;

  return (
    <header className="shoji-panel" style={{
      position: 'fixed', top: 20, left: 20, right: 20, zIndex: 900,
      padding: '12px 24px', borderRadius: '9999px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '16px', flexWrap: 'wrap', border: '1px solid rgba(244, 114, 182, 0.3)',
    }}>
      {/* Brand Logo with Torii Crimson Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => window.location.reload()}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '19px', boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
        }}>
          ⛩️
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h1 className="font-display text-gradient-sakura" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.5px' }}>
              POLYCRAFT 3D
            </h1>
            <span className="font-jp" style={{ fontSize: 13, color: '#f472b6', opacity: 0.8 }}>
              インド3Dマップ
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            Minecraft x Japanese Voxel Zen Explorer
          </p>
        </div>
      </div>

      {/* Search Input with Lantern Icon */}
      <div ref={dropdownRef} style={{ position: 'relative', width: '250px' }}>
        <input
          type="text"
          className="zen-input"
          placeholder="🏮 Search state or capital..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          style={{ width: '100%' }}
        />
        {showDropdown && filteredStates.length > 0 && (
          <div className="shoji-panel animate-pop-in" style={{
            position: 'absolute', top: 'calc(100% + 10px)', left: 0, right: 0, zIndex: 999,
            padding: '8px', overflow: 'hidden', background: 'rgba(15, 23, 42, 0.95)',
            borderRadius: '16px', border: '1px solid rgba(244, 114, 182, 0.4)',
          }}>
            {filteredStates.map(s => (
              <div
                key={s.id}
                style={{
                  padding: '10px 14px', borderRadius: '10px', color: '#fff', cursor: 'pointer',
                  fontSize: 13.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(244, 114, 182, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => {
                  onSelectState(s)
                  setSearchQuery('')
                  setShowDropdown(false)
                }}
              >
                <div>
                  <strong style={{ color: '#fff' }}>{s.name}</strong>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>({s.capital})</span>
                </div>
                <span className="font-code text-gradient-sakura" style={{ fontSize: 13, fontWeight: 700 }}>
                  ₹{(s.totalGdp/1000).toFixed(0)}k Cr
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mode Switcher Segment Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(30, 41, 59, 0.5)', padding: '4px', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <button
          className={`zen-pill ${heatmapMode === 'none' ? 'active' : ''}`}
          onClick={() => onSelectHeatmapMode('none')}
        >
          🌸 Sakura
        </button>
        <button
          className={`zen-pill ${heatmapMode === 'gdp' ? 'active' : ''}`}
          onClick={() => onSelectHeatmapMode('gdp')}
        >
          🎍 Matcha GDP
        </button>
        <button
          className={`zen-pill ${heatmapMode === 'population' ? 'active' : ''}`}
          onClick={() => onSelectHeatmapMode('population')}
        >
          ⛩️ Torii Pop
        </button>
        <button
          className={`zen-pill ${heatmapMode === 'perCapita' ? 'active' : ''}`}
          onClick={() => onSelectHeatmapMode('perCapita')}
        >
          🎑 Golden Inc
        </button>
      </div>

      {/* National Overview & Table Explorer Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            総GDP (Total GDP)
          </span>
          <span className="font-code text-gradient-amber" style={{ fontSize: 15, fontWeight: 700 }}>{fmtCurrency(NATIONAL_STATS.totalGdp)}</span>
        </div>
        <div style={{ width: 1, height: 26, background: 'rgba(255, 255, 255, 0.12)' }} />
        <button
          className="zen-pill"
          onClick={onToggleTableView}
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderColor: '#f87171', color: '#fff', fontWeight: 700,
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
          }}
        >
          📊 Table Explorer
        </button>
      </div>
    </header>
  )
}
