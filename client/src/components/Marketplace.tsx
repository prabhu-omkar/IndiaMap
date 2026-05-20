import { useState, useEffect } from 'react'
import api from '../api'

export default function Marketplace({ user, onClose, onAction, showNotif }: any) {
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadListings = async () => {
    try {
      const res = await api.get('/districts/marketplace')
      setListings(res.data)
    } catch {}
  }

  useEffect(() => { loadListings() }, [])

  const fmt = (n: number) => `₹${n.toLocaleString()}`

  const handleBuy = async (district: any) => {
    setLoading(true)
    try {
      const res = await api.post('/districts/buy', { districtId: district.id })
      showNotif(res.data.message)
      await onAction()
      await loadListings()
    } catch (err: any) {
      showNotif(err.response?.data?.error || 'Purchase failed')
    }
    setLoading(false)
  }

  return (
    <div className="marketplace">
      <div className="mk-header">
        <h3 className="mk-title">市場 Marketplace</h3>
        <div className="sp-close" onClick={onClose}>✕</div>
      </div>
      <div className="mk-subtitle label-small">Districts listed for sale by other players</div>
      <div className="mk-list">
        {listings.length === 0 && (
          <div className="mk-empty">No districts for sale right now.</div>
        )}
        {listings.map((d: any) => (
          <div className="mk-item" key={d.id}>
            <div className="mk-item-info">
              <div className="mk-item-name">{d.name}</div>
              <div className="mk-item-meta">
                {d.state?.name} · GDP: {fmt(d.gdp)} Cr/day
              </div>
              <div className="mk-item-seller">
                Seller: <span style={{ color: d.owner?.color }}>{d.owner?.username}</span>
              </div>
            </div>
            <div className="mk-item-action">
              <div className="mk-price">{fmt(d.salePrice || d.basePrice)} Cr</div>
              {d.ownerId !== user.id ? (
                <button
                  className="btn btn-buy-sm"
                  disabled={loading || user.walletBalance < (d.salePrice || d.basePrice)}
                  onClick={() => handleBuy(d)}
                >
                  Buy
                </button>
              ) : (
                <span className="label-small">Your listing</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
