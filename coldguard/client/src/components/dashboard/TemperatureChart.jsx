function getLabelIndexes(length) {
  if (length <= 4) {
    return Array.from({ length }, (_, index) => index)
  }

  const lastIndex = length - 1
  const indexes = [
    0,
    Math.round(lastIndex / 3),
    Math.round((lastIndex * 2) / 3),
    lastIndex,
  ]

  return [...new Set(indexes)]
}

function TemperatureChart({ history, solarPower, solarIsGenerating, solarStatus, actionTaken }) {
  if (!history.length) {
    return (
      <section className="panel chart-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Temperature history</p>
            <h2>Cargo temperature trend</h2>
          </div>
        </div>
        <p className="panel-copy">Waiting for live feed...</p>
      </section>
    )
  }

  const points = history.slice(-10)
  const labelPoints = getLabelIndexes(points.length)
    .map((index) => points[index])
    .filter(Boolean)

  const temperatures = points.map((point) => point.temperature)
  const maxTemp = Math.max(...temperatures, 10.5)
  const minTemp = Math.min(...temperatures, 2)
  const midTemp = (maxTemp + minTemp) / 2

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

      <div className="chart-layout">
        <div className="chart-y-axis" aria-hidden="true">
          <span>{maxTemp.toFixed(1)} deg C</span>
          <span>{midTemp.toFixed(1)} deg C</span>
          <span>{minTemp.toFixed(1)} deg C</span>
        </div>

        <div className="chart-main">
          <div className="chart-frame">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline className="chart-line chart-line-temp" points={temperaturePoints} />
            </svg>
          </div>

          <div className="chart-labels">
            {labelPoints.map((point, index) => (
              <span key={`${point.id || point.recordedAt || point.label}-${index}`}>
                {point.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-legend">
        <span className="legend-temp">Cargo temperature</span>
      </div>

      <div className="chart-axis-titles">
        <span>Y-axis: Temperature</span>
        <span>X-axis: Time</span>
      </div>

      <div className="chart-sensor-strip">
        <div className="chart-sensor-item">
          <span>Solar power</span>
          <strong>
            {solarPower === null || solarPower === undefined
              ? 'Awaiting sensor...'
              : `${solarPower.toFixed(1)} W`}
          </strong>
        </div>
        <div className="chart-sensor-item">
          <span>Solar state</span>
          <strong>
            {solarStatus || (solarIsGenerating ? 'GENERATING' : 'Awaiting sensor...')}
          </strong>
        </div>
        <div className="chart-sensor-item">
          <span>Last action</span>
          <strong>{actionTaken || 'Awaiting sensor...'}</strong>
        </div>
      </div>
    </section>
  )
}

export default TemperatureChart
