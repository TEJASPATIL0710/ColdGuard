function EnergyUsageCard({ solarPower, solarInput, solarIsGenerating, solarStatus }) {
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Solar telemetry</p>
          <h2>{solarPower.toFixed(1)} W</h2>
        </div>
        <span className={`tone-pill ${solarIsGenerating ? 'tone-safe' : 'tone-critical'}`}>
          {solarIsGenerating ? 'Generating' : 'No generation'}
        </span>
      </div>

      <div className="panel-grid-meta energy-meta">
        <div>
          <span>Solar status</span>
          <strong>{solarStatus || 'Unavailable'}</strong>
        </div>
        <div>
          <span>Solar input</span>
          <strong>{solarInput.toFixed(1)} W</strong>
        </div>
      </div>

      <p className="panel-copy">
        Displayed directly from the latest received solar packet.
      </p>
    </article>
  )
}

export default EnergyUsageCard
