import { getTemperatureFill } from '../../utils/calculations'

function TemperatureCard({ temperature, status }) {
  const fill = getTemperatureFill(temperature)

  return (
    <article className="panel panel-temperature">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Cargo temperature</p>
          <h2>{temperature.toFixed(1)} deg C</h2>
        </div>
        <span className={`tone-pill tone-${status.tone}`}>{status.label}</span>
      </div>

      <div className="temperature-band" aria-hidden="true">
        <div className="temperature-band-fill" style={{ width: `${fill}%` }} />
      </div>

      <div className="stat-row">
        <span>Safe band</span>
        <strong>2 deg C to 8 deg C</strong>
      </div>
      <p className="panel-copy">{status.message}</p>
    </article>
  )
}

export default TemperatureCard
