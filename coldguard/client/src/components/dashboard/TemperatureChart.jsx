function TemperatureChart({ history }) {
  const points = history.slice(-12)

  const temperatures = points.map((point) => point.temperature)
  const maxTemp = Math.max(...temperatures, 10.5)
  const minTemp = Math.min(...temperatures, 2)

  const getPointString = (values, min, max) =>
    values
      .map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * 100
        const y = 100 - ((value - min) / Math.max(max - min, 1)) * 100
        return `${x},${y}`
      })
      .join(' ')

  const temperaturePoints = getPointString(temperatures, minTemp, maxTemp)

  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Temperature history</p>
          <h2>Cargo temperature trend</h2>
        </div>
      </div>

      <div className="chart-frame">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline className="chart-line chart-line-temp" points={temperaturePoints} />
        </svg>
      </div>

      <div className="chart-legend">
        <span className="legend-temp">Cargo temperature</span>
      </div>

      <div className="chart-labels">
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </section>
  )
}

export default TemperatureChart
