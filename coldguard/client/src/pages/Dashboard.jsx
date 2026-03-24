import AlertBox from '../components/dashboard/AlertBox'
import BatteryCard from '../components/dashboard/BatteryCard'
import ControlButtons from '../components/dashboard/ControlButtons'
import CoolingStatus from '../components/dashboard/CoolingStatus'
import MetricsPanel from '../components/dashboard/MetricsPanel'
import TemperatureCard from '../components/dashboard/TemperatureCard'
import TemperatureChart from '../components/dashboard/TemperatureChart'
import { useSimulationContext } from '../context/SimulationContext'
import { formatTime } from '../utils/calculations'

function Dashboard() {
  const simulation = useSimulationContext()

  return (
    <main className="dashboard-shell">
      <section className="hero-banner">
        <div>
          <p className="eyebrow">ColdGuard demo dashboard</p>
          <h1>Portable cold chain digital twin for vaccine-safe delivery</h1>
          <p className="hero-copy">
            Simulated live telemetry for temperature control, power reserve, alerts, and
            evaluation metrics.
          </p>
        </div>

        <div className="hero-meta">
          <div className="hero-stat">
            <span>Mode</span>
            <strong>{simulation.modeLabel}</strong>
          </div>
          <div className="hero-stat">
            <span>Last updated</span>
            <strong>{formatTime(simulation.lastUpdated)}</strong>
          </div>
        </div>
      </section>

      <ControlButtons
        isRunning={simulation.isRunning}
        onToggleSimulation={simulation.toggleSimulation}
        onTriggerFailure={simulation.triggerFailure}
        onRestoreSystem={simulation.restoreSystem}
      />

      <section className="dashboard-grid">
        <TemperatureCard
          temperature={simulation.temperature}
          status={simulation.temperatureStatus}
        />
        <BatteryCard
          batteryLevel={simulation.batteryLevel}
          backupHours={simulation.backupHours}
          solarInput={simulation.solarInput}
          batteryStatus={simulation.batteryStatus}
        />
        <CoolingStatus
          coolingActive={simulation.coolingActive}
          modeLabel={simulation.modeLabel}
          ambientTemperature={simulation.ambientTemperature}
          location={simulation.location}
        />
        <AlertBox alert={simulation.alert} />
      </section>

      <section className="dashboard-lower">
        <TemperatureChart history={simulation.history} />
        <MetricsPanel metrics={simulation.metrics} />
      </section>

      <section className="panel event-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Operations log</p>
            <h2>Recent system events</h2>
          </div>
        </div>

        <div className="event-list">
          {simulation.eventLog.map((event) => (
            <article className="event-item" key={`${event.time}-${event.message}`}>
              <span>{event.time}</span>
              <p>{event.message}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default Dashboard
