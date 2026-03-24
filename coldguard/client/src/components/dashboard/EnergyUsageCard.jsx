function EnergyUsageCard({ energyUsage, solarInput }) {
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Energy usage</p>
          <h2>{energyUsage} Wh/day</h2>
        </div>
        <span className="tone-pill tone-neutral">Live power profile</span>
      </div>

      <div className="panel-grid-meta energy-meta">
        <div>
          <span>Current draw basis</span>
          <strong>Cooling + control load</strong>
        </div>
        <div>
          <span>Solar support</span>
          <strong>{solarInput}%</strong>
        </div>
      </div>

      <p className="panel-copy">
        Daily energy estimate updates with operating mode and active cooling demand.
      </p>
    </article>
  )
}

export default EnergyUsageCard
