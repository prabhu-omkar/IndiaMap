import { useState, useEffect } from 'react'
import api from '../api'

export default function MyEmpire({ user, onClose, onAction, showNotif }: any) {
  const [districts, setDistricts] = useState<any[]>([])
  const [auctionPrice, setAuctionPrice] = useState('')
  const [loading, setLoading] = useState(false)

  const fmt = (n: number) => `₹${n.toLocaleString()}`

  const loadMyDistricts = async () => {
    try {
      const res = await api.get('/states')
      const all: any[] = []
      res.data.forEach((s: any) => {
        (s.cities || []).forEach((d: any) => {
          if (d.ownerId === user.id) all.push({ ...d, stateName: s.name })
        })
      })
      setDistricts(all)
    } catch {}
  }

  useEffect(() => { loadMyDistricts() }, [])

  const handleSell = async (district: any) => {
    if (!confirm(`Sell ${district.name} for ${fmt(Math.floor(district.basePrice / 2))} Cr?`)) return
    setLoading(true)
    try {
      const res = await api.post('/cities/sell-to-bank', { cityId: district.id })
      showNotif(res.data.message)
      await onAction()
      await loadMyDistricts()
    } catch (err: any) {
      showNotif(err.response?.data?.error || 'Failed')
    }
    setLoading(false)
  }

  const handleAuction = async (district: any) => {
    const price = parseInt(auctionPrice) || district.basePrice
    setLoading(true)
    try {
      const res = await api.post('/cities/auction/create', { cityId: district.id, startPrice: price })
      showNotif(res.data.message)
      setAuctionPrice('')
      await onAction()
      await loadMyDistricts()
    } catch (err: any) {
      showNotif(err.response?.data?.error || 'Failed')
    }
    setLoading(false)
  }

  const totalIncome = districts.reduce((s, d) => s + d.gdp, 0)

  return (
    <div className="marketplace">
      <div className="mk-header">
        <h3 className="mk-title">My Cities</h3>
        <div className="sp-close" onClick={onClose}>✕</div>
      </div>
      <div style={{ background: '#8b8b8b', border: '4px solid #555', padding: 10, color: '#fff', textShadow: '2px 2px 0 #000', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div className="label-small">Properties</div>
          <div style={{ fontSize: 22, color: '#55FF55' }}>{districts.length}</div>
        </div>
        <div>
          <div className="label-small">Daily Income</div>
          <div style={{ fontSize: 22, color: '#FFFF55' }}>{fmt(totalIncome)} Cr</div>
        </div>
      </div>

      <div className="mk-list">
        {districts.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 18, color: '#666' }}>
            You don't own any properties yet. Open the Daily Chest!
          </div>
        )}
        {districts.map((d: any) => (
          <div className="mk-item" key={d.id} style={{ flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
              <div>
                <div className="mk-item-name">{d.name}</div>
                <div style={{ fontSize: 14, color: '#ccc' }}>{d.stateName} · GDP: {fmt(d.gdp)} Cr/day</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mk-price">{fmt(d.basePrice)} Cr</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <button className="btn" style={{ width: '100%', fontSize: 16 }} disabled={loading}
                onClick={() => handleSell(d)}>
                Sell to Bank ({fmt(Math.floor(d.basePrice / 2))})
              </button>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input-sale" type="number" style={{ flex: 1, minWidth: 0 }}
                  placeholder="Auction price..."
                  value={auctionPrice}
                  onChange={e => setAuctionPrice(e.target.value)} />
                <button className="btn" style={{ fontSize: 16, whiteSpace: 'nowrap' }} disabled={loading}
                  onClick={() => handleAuction(d)}>
                  Auction
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
