function EnergyUsageCard({ solarPower, solarInput, solarIsGenerating, solarStatus }) {
  const hasSolarPower = solarPower !== null && solarPower !== undefined
  const hasSolarInput = solarInput !== null && solarInput !== undefined

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Solar telemetry</p>
          <h2>{hasSolarPower ? `${solarPower.toFixed(1)} W` : 'Awaiting sensor...'}</h2>
        </div>
        <span
          className={`tone-pill ${
            hasSolarInput ? (solarIsGenerating ? 'tone-safe' : 'tone-critical') : 'tone-neutral'
          }`}
        >
          {hasSolarInput ? (solarIsGenerating ? 'Generating' : 'No generation') : 'Awaiting feed'}
        </span>
      </div>

      <div className="panel-grid-meta energy-meta">
        <div>
          <span>Solar status</span>
          <strong>{solarStatus || 'Awaiting sensor...'}</strong>
        </div>
        <div>
          <span>Solar input</span>
          <strong>{hasSolarInput ? `${solarInput.toFixed(1)} W` : 'Awaiting sensor...'}</strong>
        </div>
      </div>

      <p className="panel-copy">
        {hasSolarInput
          ? 'Displayed directly from the latest received solar packet.'
          : 'Awaiting sensor...'}
      </p>
    </article>
  )
}

export default EnergyUsageCard
