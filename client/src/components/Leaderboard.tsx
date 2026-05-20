export default function Leaderboard({ data }: { data: any }) {
  const entries = data?.data || []
  const fmt = (n: number) => `₹${(n || 0).toLocaleString()} Cr`

  return (
    <div className="leaderboard">
      <div className="lb-header">
        <span className="label-small">PolyCraft Rankings</span>
      </div>
      <div className="lb-list">
        {entries.length === 0 && (
          <div className="lb-empty">No players ranked yet.</div>
        )}
        {entries.slice(0, 8).map((entry: any) => (
          <div className="lb-item" key={entry.id}>
            <span className="lb-rank">{entry.rank <= 3 ? ['壱', '弐', '参'][entry.rank - 1] : entry.rank}</span>
            <div className="lb-dot" style={{ background: entry.color }} />
            <div className="lb-info">
              <span className="lb-name">{entry.username}</span>
              <span className="lb-districts">{entry.districtsOwned} districts</span>
            </div>
            <span className="lb-income mono">{fmt(entry.dailyIncome)}/day</span>
          </div>
        ))}
      </div>
    </div>
  )
}
