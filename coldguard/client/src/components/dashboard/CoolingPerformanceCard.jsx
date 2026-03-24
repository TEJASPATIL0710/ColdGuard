function CoolingPerformanceCard({ coolingPerformance, coolingLabel, coolingActive }) {
  const hasPerformance = coolingPerformance !== null && coolingPerformance !== undefined

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Cooling performance</p>
          <h2>{hasPerformance ? `${coolingPerformance}%` : 'Awaiting sensor...'}</h2>
        </div>
        <span className={`tone-pill ${hasPerformance ? (coolingActive ? 'tone-safe' : 'tone-neutral') : 'tone-neutral'}`}>
          {hasPerformance ? (coolingActive ? 'Active' : 'Standby') : 'Awaiting feed'}
        </span>
      </div>

      <div className="performance-shell" aria-hidden="true">
        <div
          className="performance-fill"
          style={{ width: `${hasPerformance ? Math.min(coolingPerformance, 100) : 0}%` }}
        />
      </div>

      <div className="panel-grid-meta">
        <div>
          <span>Current load</span>
          <strong>{coolingLabel || 'Awaiting sensor...'}</strong>
        </div>
        <div>
          <span>Output status</span>
          <strong>
            {hasPerformance ? (coolingActive ? 'Cooling engaged' : 'Monitoring only') : 'Awaiting sensor...'}
          </strong>
        </div>
      </div>
    </article>
  )
}

export default CoolingPerformanceCard
