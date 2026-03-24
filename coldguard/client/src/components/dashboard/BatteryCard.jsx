function BatteryCard({
  batteryLevel,
  backupHours,
  batteryStatus,
  batteryIsCharging,
  batteryStatusCode,
}) {
  const hasBatteryLevel = batteryLevel !== null && batteryLevel !== undefined
  const hasBackupHours = backupHours !== null && backupHours !== undefined

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Battery utilization</p>
          <h2>{hasBatteryLevel ? `${batteryLevel.toFixed(1)}%` : 'Awaiting sensor...'}</h2>
        </div>
        <span className={`tone-pill tone-${batteryStatus?.tone || 'neutral'}`}>
          {batteryStatus?.label || 'Awaiting feed'}
        </span>
      </div>

      <div className="battery-shell" aria-hidden="true">
        <div className="battery-fill" style={{ width: `${hasBatteryLevel ? batteryLevel : 0}%` }} />
      </div>

      <div className="panel-grid-meta">
        <div>
          <span>Battery state</span>
          <strong>{batteryStatusCode || batteryStatus?.label || 'Awaiting sensor...'}</strong>
        </div>
        <div>
          <span>Charge mode</span>
          <strong>
            {hasBatteryLevel ? (batteryIsCharging ? 'Charging' : 'Discharging') : 'Awaiting sensor...'}
          </strong>
        </div>
        <div>
          <span>Live battery level</span>
          <strong>{hasBatteryLevel ? `${batteryLevel.toFixed(1)}%` : 'Awaiting sensor...'}</strong>
        </div>
        <div>
          <span>Available backup</span>
          <strong>{hasBackupHours ? `${backupHours.toFixed(1)} hrs` : 'Awaiting sensor...'}</strong>
        </div>
      </div>
    </article>
  )
}

export default BatteryCard
