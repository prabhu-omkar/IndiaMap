import { useState, useEffect } from 'react'
import api from '../api'

export default function AuctionHouse({ user, onClose, onAction, showNotif }: any) {
  const [auctions, setAuctions] = useState<any[]>([])
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const fmt = (n: number) => `₹${Math.ceil(n).toLocaleString()}`

  const loadAuctions = async () => {
    try {
      const res = await api.get('/cities/auctions')
      setAuctions(res.data)
    } catch {}
  }

  useEffect(() => { loadAuctions() }, [])

  const handleBid = async (auctionId: string) => {
    const amount = parseInt(bidAmounts[auctionId] || '0')
    if (!amount) return showNotif('Enter a bid amount')
    setLoading(true)
    try {
      const res = await api.post('/cities/auction/bid', { auctionId, amount })
      showNotif(res.data.message)
      await loadAuctions()
      await onAction()
    } catch (err: any) {
      showNotif(err.response?.data?.error || 'Bid failed')
    }
    setLoading(false)
  }

  const handleCancel = async (auctionId: string) => {
    setLoading(true)
    try {
      const res = await api.post('/cities/auction/cancel', { auctionId })
      showNotif(res.data.message)
      await loadAuctions()
    } catch (err: any) {
      showNotif(err.response?.data?.error || 'Cancel failed')
    }
    setLoading(false)
  }

  const timeLeft = (endsAt: string) => {
    const ms = new Date(endsAt).getTime() - Date.now()
    if (ms <= 0) return 'Ending...'
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  return (
    <div className="marketplace">
      <div className="mk-header">
        <h3 className="mk-title">Auction House</h3>
        <div className="sp-close" onClick={onClose}>✕</div>
      </div>
      <div className="mk-subtitle label-small">Active 24-hour auctions · Highest bid wins</div>
      <div className="mk-list">
        {auctions.length === 0 && (
          <div className="mk-empty">No active auctions right now.</div>
        )}
        {auctions.map((a: any) => {
          const isSeller = a.sellerId === user.id
          const isBidder = a.bidderId === user.id
          const minBid = a.currentBid ? Math.ceil(a.currentBid + Math.max(1000, a.currentBid * 0.05)) : a.startPrice

          return (
            <div className="mk-item" key={a.id} style={{ flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                <div>
                  <div className="mk-item-name">{a.city.name}</div>
                  <div className="mk-item-meta">
                    {a.city.state?.name} · GDP: {fmt(a.city.gdp)} Cr/day
                  </div>
                  <div className="mk-item-seller" style={{ marginTop: '8px' }}>
                    Seller: <span style={{ color: a.seller?.color }}>{a.seller?.username}</span>
                    {isSeller && <span style={{ color: 'var(--matcha)', marginLeft: '8px' }}>(You)</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="label-small" style={{ marginBottom: '6px' }}>⏱ {timeLeft(a.endsAt)}</div>
                  <div className="mk-price">
                    {a.currentBid ? fmt(a.currentBid) : fmt(a.startPrice)} Cr
                  </div>
                  {a.bidder && (
                    <div style={{ fontSize: '11px', color: isBidder ? 'var(--matcha)' : 'var(--ink-tertiary)', marginTop: '4px' }}>
                      {isBidder ? '🏆 Your bid leads' : `Bid by ${a.bidder.username}`}
                    </div>
                  )}
                </div>
              </div>

              {!isSeller && (
                <div className="sell-form" style={{ width: '100%' }}>
                  <input
                    className="input-sale"
                    type="number"
                    placeholder={`Min bid: ${fmt(minBid)}`}
                    value={bidAmounts[a.id] || ''}
                    onChange={e => setBidAmounts({ ...bidAmounts, [a.id]: e.target.value })}
                  />
                  <button className="btn btn-sell" disabled={loading} onClick={() => handleBid(a.id)}>
                    Place Bid
                  </button>
                </div>
              )}

              {isSeller && !a.currentBid && (
                <button className="btn btn-cancel" style={{ width: '100%' }} disabled={loading} onClick={() => handleCancel(a.id)}>
                  Cancel Auction
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
