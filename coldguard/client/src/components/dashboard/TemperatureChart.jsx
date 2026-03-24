function TemperatureChart({ history }) {
  const points = history.slice(-12)

  const temperatures = points.map((point) => point.temperature)
  const batteries = points.map((point) => point.batteryLevel)
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
  const batteryPoints = getPointString(batteries, 0, 100)

  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Live telemetry</p>
          <h2>Temperature and battery trend</h2>
        </div>
      </div>

      <div className="chart-frame">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline className="chart-line chart-line-temp" points={temperaturePoints} />
          <polyline className="chart-line chart-line-battery" points={batteryPoints} />
        </svg>
      </div>

      <div className="chart-legend">
        <span className="legend-temp">Temperature</span>
        <span className="legend-battery">Battery</span>
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
