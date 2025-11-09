import { useState, useEffect } from 'react'
import api from '../api'

export default function DailyChest({ user, onClose, onAction, showNotif }: any) {
  const [chest, setChest] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const fmt = (n: number) => `₹${n.toLocaleString()}`

  const openChest = async () => {
    setOpening(true)
    try {
      const res = await api.get('/cities/chest')
      // Animate reveal
      setTimeout(() => {
        setChest(res.data.chest)
        setRevealed(true)
        setOpening(false)
      }, 800)
    } catch (err: any) {
      showNotif(err.response?.data?.error || 'Failed to open chest')
      setOpening(false)
    }
  }

  useEffect(() => {
    // Check if already opened
    api.get('/cities/chest').then(res => {
      if (res.data.alreadyOpened) {
        setChest(res.data.chest)
        setRevealed(true)
      }
    }).catch(() => {})
  }, [])

  const handleBuy = async (cityId: string) => {
    setLoading(true)
    try {
      const res = await api.post('/cities/chest/buy', { cityId })
      showNotif(res.data.message)
      await onAction()
      // Refresh chest
      const chestRes = await api.get('/cities/chest')
      setChest(chestRes.data.chest)
    } catch (err: any) {
      showNotif(err.response?.data?.error || 'Purchase failed')
    }
    setLoading(false)
  }

  const cities = chest ? [chest.city1, chest.city2, chest.city3] : []
  const alreadyBought = chest?.purchasedId

  return (
    <div className="marketplace">
      <div className="mk-header">
        <h3 className="mk-title">Daily Chest</h3>
        <div className="sp-close" onClick={onClose}>✕</div>
      </div>
      <div className="mk-subtitle label-small">
        {alreadyBought ? 'You already purchased today. Come back tomorrow!'
          : revealed ? 'Choose one property to purchase today'
          : 'Open your daily chest to reveal 3 properties'}
      </div>
      <div className="mk-list">
        {!revealed && !opening && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <button className="btn btn-empire" onClick={openChest} style={{ width: 'auto', padding: '20px 48px', fontSize: '16px' }}>
              🎁 Open Chest
            </button>
            <p style={{ marginTop: '16px', color: 'var(--ink-tertiary)', fontSize: '13px' }}>
              You get 3 random available cities. Buy 1 per day.
            </p>
          </div>
        )}

        {opening && (
          <div style={{ padding: '60px', textAlign: 'center', fontSize: '14px', color: 'var(--ink-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 0.5s infinite alternate' }}>🎁</div>
            Opening chest...
          </div>
        )}

        {revealed && cities.map((d: any) => {
          const isBought = chest.purchasedId === d.id
          const canBuy = !alreadyBought && user.walletBalance >= d.basePrice
          return (
            <div className={`mk-item ${isBought ? 'chest-bought' : ''}`} key={d.id}
              style={isBought ? { borderColor: 'var(--matcha)', background: 'var(--matcha-light)' } : {}}>
              <div className="mk-item-info">
                <div className="mk-item-name">{d.name}</div>
                <div className="mk-item-meta">
                  {d.state?.name} · GDP: {fmt(d.gdp)} Cr/day
                </div>
              </div>
              <div className="mk-item-action">
                <div className="mk-price">{fmt(d.basePrice)} Cr</div>
                {isBought ? (
                  <span className="badge badge-owned">Purchased ✓</span>
                ) : alreadyBought ? (
                  <span className="label-small" style={{ color: 'var(--ink-faint)' }}>—</span>
                ) : (
                  <button className="btn btn-buy-sm" disabled={loading || !canBuy} onClick={() => handleBuy(d.id)}>
                    {loading ? '...' : canBuy ? 'Buy' : 'Not enough ₹'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
