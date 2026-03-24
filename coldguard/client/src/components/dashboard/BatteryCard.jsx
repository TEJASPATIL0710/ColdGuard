function BatteryCard({ batteryLevel, backupHours, solarInput, batteryStatus }) {
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Power reserve</p>
          <h2>{batteryLevel.toFixed(1)}%</h2>
        </div>
        <span className={`tone-pill tone-${batteryStatus.tone}`}>{batteryStatus.label}</span>
      </div>

      <div className="battery-shell" aria-hidden="true">
        <div className="battery-fill" style={{ width: `${batteryLevel}%` }} />
      </div>

      <div className="panel-grid-meta">
        <div>
          <span>Estimated backup</span>
          <strong>{backupHours.toFixed(1)} hrs</strong>
        </div>
        <div>
          <span>Solar contribution</span>
          <strong>{solarInput}%</strong>
        </div>
      </div>
    </article>
  )
}

export default BatteryCard
