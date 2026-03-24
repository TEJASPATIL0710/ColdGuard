function MetricsPanel({ metrics }) {
  return (
    <section className="panel metrics-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Evaluation snapshot</p>
          <h2>Hackathon metrics</h2>
        </div>
      </div>

      <div className="metrics-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.key}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.target}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

export default MetricsPanel
