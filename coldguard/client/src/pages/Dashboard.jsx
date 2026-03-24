import BatteryCard from '../components/dashboard/BatteryCard'
import CoolingPerformanceCard from '../components/dashboard/CoolingPerformanceCard'
import EnergyUsageCard from '../components/dashboard/EnergyUsageCard'
import TemperatureCard from '../components/dashboard/TemperatureCard'
import TemperatureChart from '../components/dashboard/TemperatureChart'
import { useSimulationContext } from '../context/SimulationContext'

function formatSensorTimestamp(value) {
  if (!value) {
    return 'Waiting for sensor feed'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

function formatBatteryValue(value) {
  return value === null ? 'N/A' : `${value.toFixed(1)}%`
}

function Dashboard() {
  const simulation = useSimulationContext()
  const sensorSource =
    simulation.sensorFeedSource || simulation.lastSensorReading?.source || 'simulated'
  const lastPacketLabel = formatSensorTimestamp(simulation.lastSensorReading?.recordedAt)

  return (
    <main className="dashboard-shell">
      <section className="hero-banner">
        <div>
          <p className="eyebrow">ColdGuard operations</p>
          <h1>Live cold chain telemetry and cooling control</h1>
        </div>

        <div className="hero-meta">
          <div className="hero-stat">
            <span>Displayed sensor</span>
            <strong>{sensorSource}</strong>
          </div>
          <div className="hero-stat">
            <span>Last packet</span>
            <strong>{lastPacketLabel}</strong>
          </div>
          <div className="hero-stat">
            <span>Tracked sensor feeds</span>
            <strong>{simulation.activeSensorCount}</strong>
          </div>
        </div>
      </section>

      {simulation.error ? (
        <article className="panel alert-panel alert-active">
          <p className="eyebrow">Connection</p>
          <h2>Backend sync issue</h2>
          <p className="panel-copy">{simulation.error}</p>
        </article>
      ) : null}

      <section className="dashboard-grid">
        <TemperatureCard
          temperature={simulation.temperature}
          status={simulation.temperatureStatus}
        />
        <BatteryCard
          batteryLevel={simulation.batteryLevel}
          backupHours={simulation.backupHours}
          batteryStatus={simulation.batteryStatus}
          batteryIsCharging={simulation.batteryIsCharging}
          batteryStatusCode={simulation.batteryStatusCode}
        />
        <EnergyUsageCard
          solarPower={simulation.solarPower}
          solarInput={simulation.solarInput}
          solarIsGenerating={simulation.solarIsGenerating}
          solarStatus={simulation.solarStatus}
        />
        <CoolingPerformanceCard
          coolingPerformance={simulation.coolingPerformance}
          coolingLabel={simulation.coolingLabel}
          coolingActive={simulation.coolingActive}
        />
      </section>

      <section className="dashboard-lower dashboard-lower-compact">
        <TemperatureChart
          history={simulation.history}
          solarPower={simulation.solarPower}
          solarIsGenerating={simulation.solarIsGenerating}
          solarStatus={simulation.solarStatus}
          actionTaken={simulation.lastSensorReading?.actionTaken}
        />

        <article className="panel summary-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">System summary</p>
              <h2>Live feed overview</h2>
            </div>
            <span
              className={`tone-pill ${
                simulation.sensorFeedActive ? 'tone-safe' : 'tone-neutral'
              }`}
            >
              {simulation.sensorFeedActive ? 'Sensor mode' : 'Simulated'}
            </span>
          </div>

          <div className="summary-grid">
            <div>
              <span>Transport mode</span>
              <strong>{simulation.modeLabel}</strong>
            </div>
            <div>
              <span>Cooling state</span>
              <strong>{simulation.coolingActive ? 'ON' : 'Standby'}</strong>
            </div>
            <div>
              <span>Solar condition</span>
              <strong>{simulation.solarStatus || 'Unavailable'}</strong>
            </div>
            <div>
              <span>Sensor source</span>
              <strong>{sensorSource}</strong>
            </div>
            <div>
              <span>Last action</span>
              <strong>{simulation.lastSensorReading?.actionTaken || 'monitoring'}</strong>
            </div>
            <div>
              <span>Last packet</span>
              <strong>{lastPacketLabel}</strong>
            </div>
          </div>

          <div className="sensor-feed-strip">
            <div className="sensor-feed-head">
              <span>Recent sensor feeds</span>
              <strong>{simulation.activeSensorCount} tracked</strong>
            </div>

            <div className="sensor-feed-list">
              {simulation.activeSensors.length > 0 ? (
                simulation.activeSensors.slice(0, 4).map((sensor) => (
                  <div className="sensor-feed-item" key={sensor.source}>
                    <div>
                      <span>{sensor.source}</span>
                      <strong>{sensor.temperature.toFixed(1)} deg C</strong>
                    </div>
                    <div>
                      <span>Battery</span>
                      <strong>{formatBatteryValue(sensor.batteryLevel)}</strong>
                    </div>
                    <div>
                      <span>Solar</span>
                      <strong>{sensor.solarStatus || 'Unavailable'}</strong>
                    </div>
                    <div>
                      <span>Action</span>
                      <strong>{sensor.actionTaken || 'monitoring'}</strong>
                    </div>
                  </div>
                ))
              ) : (
                <p className="panel-copy">
                  Waiting for external sensor packets. The dashboard will switch to live
                  feed mode automatically.
                </p>
              )}
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}

export default Dashboard
