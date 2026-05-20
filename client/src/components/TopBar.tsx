export default function TopBar({ user, onLogout, onChest, onAuctions, onTrades, onEmpire }: {
  user: any; onLogout: () => void; onChest: () => void; onAuctions: () => void; onTrades: () => void; onEmpire: () => void
}) {
  const fmt = (n: number) => `₹${(n || 0).toLocaleString()}`

  return (
    <div className="top-bar">
      <div className="logo">
        <div style={{ width: 32, height: 32, background: 'url(https://minecraft.wiki/images/Grass_Block_Grass_Side.png) center/cover', imageRendering: 'pixelated' }}></div>
        <div>
          <div>POLYCRAFT</div>
          <div className="label-small" style={{ letterSpacing: '0px' }}>Build · Trade · Conquer</div>
        </div>
      </div>
      <div className="user-info">
        <div className="stat-group">
          <span className="label-small">Treasury</span>
          <span className="stat-val mono">{fmt(user.walletBalance)}</span>
        </div>
        <div className="stat-group">
          <span className="label-small">Daily Income</span>
          <span className="stat-val mono">{fmt(user.dailyIncome)} /day</span>
        </div>
        <div className="bar-divider" />
        <button className="btn" onClick={onChest}>[ Chest ]</button>
        <button className="btn" onClick={onAuctions}>[ Auctions ]</button>
        <button className="btn" onClick={onTrades}>[ Trades ]</button>
        <button className="btn" onClick={onEmpire}>[ My Cities ]</button>
        <div className="bar-divider" />
        <div className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 16, height: 16, background: user.color, border: '2px solid #111' }} />
          <span style={{ fontSize: '20px', textShadow: '2px 2px 0 #000' }}>{user.username}</span>
        </div>
        <button className="btn btn-ghost" onClick={onLogout}>Quit</button>
      </div>
    </div>
  )
}
