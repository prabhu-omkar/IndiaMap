import { useState, useEffect } from 'react'
import api from '../api'

export default function TradePanel({ user, onClose, onAction, showNotif }: any) {
  const [trades, setTrades] = useState<any[]>([])
  const [allDistricts, setAllDistricts] = useState<any[]>([])
  const [counterAmounts, setCounterAmounts] = useState<Record<string, string>>({})
  const [offerAmounts, setOfferAmounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'offers'|'browse'>('offers')

  const fmt = (n: number) => `₹${Math.ceil(n).toLocaleString()}`

  const loadTrades = async () => {
    try {
      const res = await api.get('/cities/trades')
      setTrades(res.data)
    } catch {}
  }

  const loadDistricts = async () => {
    try {
      const res = await api.get('/states')
      const all: any[] = []
      res.data.forEach((s: any) => {
        (s.cities || []).forEach((d: any) => {
          if (d.ownerId && d.ownerId !== user.id) {
            all.push({ ...d, stateName: s.name })
          }
        })
      })
      setAllDistricts(all)
    } catch {}
  }

  useEffect(() => { loadTrades(); loadDistricts() }, [])

  const respond = async (tradeId: string, action: string, counterMoney?: number) => {
    setLoading(true)
    try {
      const res = await api.post('/cities/trade/respond', { tradeId, action, counterMoney })
      showNotif(res.data.message)
      await loadTrades()
      await onAction()
    } catch (err: any) {
      showNotif(err.response?.data?.error || 'Failed')
    }
    setLoading(false)
  }

  const sendOffer = async (district: any) => {
    const money = parseInt(offerAmounts[district.id] || '0')
    if (!money || money <= 0) return showNotif('Enter an offer amount')
    setLoading(true)
    try {
      const res = await api.post('/cities/trade/send', {
        receiverId: district.ownerId,
        cityId: district.id,
        offeredMoney: money,
      })
      showNotif(res.data.message)
      setOfferAmounts({ ...offerAmounts, [district.id]: '' })
      await loadTrades()
    } catch (err: any) {
      showNotif(err.response?.data?.error || 'Trade failed')
    }
    setLoading(false)
  }

  const incoming = trades.filter(t => t.receiverId === user.id)
  const outgoing = trades.filter(t => t.senderId === user.id)

  return (
    <div className="marketplace">
      <div className="mk-header">
        <h3 className="mk-title">Trades</h3>
        <div className="sp-close" onClick={onClose}>✕</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
        <button className="btn" style={{ flex: 1, fontSize: 18, background: tab === 'offers' ? '#7a7a7a' : '#aaa' }}
          onClick={() => setTab('offers')}>
          My Trades ({trades.length})
        </button>
        <button className="btn" style={{ flex: 1, fontSize: 18, background: tab === 'browse' ? '#7a7a7a' : '#aaa' }}
          onClick={() => setTab('browse')}>
          Send Offer
        </button>
      </div>

      <div className="mk-list">
        {tab === 'offers' && (
          <>
            {trades.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 18, color: '#666' }}>No pending trades.</div>
            )}

            {incoming.length > 0 && (
              <>
                <div className="label-small" style={{ padding: '8px 16px', color: '#FF5555', textShadow: '2px 2px 0 #000' }}>
                  Incoming Offers ({incoming.length})
                </div>
                {incoming.map((t: any) => (
                  <div className="mk-item" key={t.id} style={{ flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <div>
                        <div className="mk-item-name">{t.city.name}</div>
                        <div style={{ fontSize: 14, color: '#ccc' }}>{t.city.state?.name}</div>
                        <div style={{ fontSize: 14, marginTop: 4 }}>
                          From: <span style={{ color: t.sender?.color }}>{t.sender?.username}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="label-small">Offered</div>
                        <div className="mk-price">{fmt(t.offeredMoney)} Cr</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                      <button className="btn" style={{ flex: 1, fontSize: 16, background: '#55AA55' }} disabled={loading}
                        onClick={() => respond(t.id, 'accept')}>Accept</button>
                      <button className="btn" style={{ flex: 1, fontSize: 16, background: '#AA5555' }} disabled={loading}
                        onClick={() => respond(t.id, 'decline')}>Decline</button>
                    </div>
                    <div className="sell-form" style={{ width: '100%' }}>
                      <input className="input-sale" type="number" placeholder="Counter price..."
                        value={counterAmounts[t.id] || ''}
                        onChange={e => setCounterAmounts({ ...counterAmounts, [t.id]: e.target.value })} />
                      <button className="btn" style={{ fontSize: 16 }} disabled={loading || !counterAmounts[t.id]}
                        onClick={() => respond(t.id, 'counter', parseInt(counterAmounts[t.id]))}>Counter</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {outgoing.length > 0 && (
              <>
                <div className="label-small" style={{ padding: '12px 16px 8px', color: '#55FFFF', textShadow: '2px 2px 0 #000' }}>
                  Your Offers ({outgoing.length})
                </div>
                {outgoing.map((t: any) => (
                  <div className="mk-item" key={t.id}>
                    <div>
                      <div className="mk-item-name">{t.city.name}</div>
                      <div style={{ fontSize: 14, color: '#ccc' }}>{t.city.state?.name}</div>
                      <div style={{ fontSize: 14, marginTop: 4 }}>
                        To: <span style={{ color: t.receiver?.color }}>{t.receiver?.username}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mk-price">{fmt(t.offeredMoney)} Cr</div>
                      <div style={{ fontSize: 14, color: '#FFFF55', marginTop: 4 }}>Pending...</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'browse' && (
          <>
            {allDistricts.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 18, color: '#666' }}>
                No other players own any properties yet.
              </div>
            )}
            {allDistricts.map((d: any) => (
              <div className="mk-item" key={d.id} style={{ flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    <div className="mk-item-name">{d.name}</div>
                    <div style={{ fontSize: 14, color: '#ccc' }}>{d.stateName} · GDP: {fmt(d.gdp)} Cr/day</div>
                    <div style={{ fontSize: 14, marginTop: 4 }}>
                      Owner: <span style={{ color: d.owner?.color }}>{d.owner?.username}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, color: '#aaa' }}>Value</div>
                    <div className="mk-price">{fmt(d.basePrice)} Cr</div>
                  </div>
                </div>
                <div className="sell-form" style={{ width: '100%' }}>
                  <input className="input-sale" type="number"
                    placeholder="Your offer amount..."
                    value={offerAmounts[d.id] || ''}
                    onChange={e => setOfferAmounts({ ...offerAmounts, [d.id]: e.target.value })} />
                  <button className="btn" style={{ fontSize: 16 }}
                    disabled={loading || !offerAmounts[d.id]}
                    onClick={() => sendOffer(d)}>
                    Send Offer
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
