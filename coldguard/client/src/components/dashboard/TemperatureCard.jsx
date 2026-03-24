import { getTemperatureFill } from '../../utils/calculations'

function TemperatureCard({ temperature, status }) {
  const hasTemperature = temperature !== null && temperature !== undefined
  const fill = hasTemperature ? getTemperatureFill(temperature) : 0

  return (
    <article className="panel panel-temperature">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Cargo temperature</p>
          <h2>{hasTemperature ? `${temperature.toFixed(1)} deg C` : 'Awaiting sensor...'}</h2>
        </div>
        <span className={`tone-pill tone-${status?.tone || 'neutral'}`}>
          {status?.label || 'Awaiting feed'}
        </span>
      </div>

      <div className="temperature-band" aria-hidden="true">
        <div className="temperature-band-fill" style={{ width: `${fill}%` }} />
      </div>

      <div className="stat-row">
        <span>Cargo safe range</span>
        <strong>2 deg C to 8 deg C</strong>
      </div>
      <p className="panel-copy">{status?.message || 'Awaiting sensor...'}</p>
    </article>
  )
}

export default TemperatureCard
