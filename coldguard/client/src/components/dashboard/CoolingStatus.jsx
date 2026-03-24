function CoolingStatus({ coolingActive, modeLabel, ambientTemperature, location }) {
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Active cooling</p>
          <h2>{coolingActive ? 'Peltier ON' : 'Standby'}</h2>
        </div>
        <span className={`tone-pill ${coolingActive ? 'tone-safe' : 'tone-neutral'}`}>
          {modeLabel}
        </span>
      </div>

      <div className="panel-grid-meta">
        <div>
          <span>Ambient</span>
          <strong>{ambientTemperature.toFixed(1)} deg C</strong>
        </div>
        <div>
          <span>Route point</span>
          <strong>{location}</strong>
        </div>
      </div>

      <p className="panel-copy">
        Cooling responds to thermal drift and recovery mode keeps the payload inside the
        vaccine-safe band during transport.
      </p>
    </article>
  )
}

export default CoolingStatus
