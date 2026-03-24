function BatteryCard({
  batteryLevel,
  backupHours,
  batteryStatus,
  batteryIsCharging,
  batteryStatusCode,
}) {
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Battery utilization</p>
          <h2>{batteryLevel.toFixed(1)}%</h2>
        </div>
        <span className={`tone-pill tone-${batteryStatus.tone}`}>{batteryStatus.label}</span>
      </div>

      <div className="battery-shell" aria-hidden="true">
        <div className="battery-fill" style={{ width: `${batteryLevel}%` }} />
      </div>

      <div className="panel-grid-meta">
        <div>
          <span>Battery state</span>
          <strong>{batteryStatusCode || batteryStatus.label}</strong>
        </div>
        <div>
          <span>Charge mode</span>
          <strong>{batteryIsCharging ? 'Charging' : 'Discharging'}</strong>
        </div>
        <div>
          <span>Live battery level</span>
          <strong>{batteryLevel.toFixed(1)}%</strong>
        </div>
        <div>
          <span>Available backup</span>
          <strong>{backupHours ? `${backupHours.toFixed(1)} hrs` : 'N/A'}</strong>
        </div>
      </div>
    </article>
  )
}

export default BatteryCard
