function CoolingPerformanceCard({ coolingPerformance, coolingLabel, coolingActive }) {
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Cooling performance</p>
          <h2>{coolingPerformance}%</h2>
        </div>
        <span className={`tone-pill ${coolingActive ? 'tone-safe' : 'tone-neutral'}`}>
          {coolingActive ? 'Active' : 'Standby'}
        </span>
      </div>

      <div className="performance-shell" aria-hidden="true">
        <div
          className="performance-fill"
          style={{ width: `${Math.min(coolingPerformance, 100)}%` }}
        />
      </div>

      <div className="panel-grid-meta">
        <div>
          <span>Current load</span>
          <strong>{coolingLabel}</strong>
        </div>
        <div>
          <span>Output status</span>
          <strong>{coolingActive ? 'Cooling engaged' : 'Monitoring only'}</strong>
        </div>
      </div>
    </article>
  )
}

export default CoolingPerformanceCard
