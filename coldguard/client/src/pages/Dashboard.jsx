import BatteryCard from '../components/dashboard/BatteryCard'
import CoolingPerformanceCard from '../components/dashboard/CoolingPerformanceCard'
import ControlButtons from '../components/dashboard/ControlButtons'
import EnergyUsageCard from '../components/dashboard/EnergyUsageCard'
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
          <p className="eyebrow">ColdGuard operations dashboard</p>
          <h1>Cold chain control view for cargo safety and energy performance</h1>
          <p className="hero-copy">
            Live operational view of cargo temperature, battery utilization, cooling load,
            and energy usage for the simulation box.
          </p>
        </div>

        <div className="hero-meta">
          <div className="hero-stat">
            <span>System status</span>
            <strong>{simulation.systemHealth}</strong>
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
          batteryStatus={simulation.batteryStatus}
        />
        <EnergyUsageCard
          energyUsage={simulation.energyUsage}
          solarInput={simulation.solarInput}
        />
        <CoolingPerformanceCard
          coolingActive={simulation.coolingActive}
          coolingPerformance={simulation.coolingPerformance}
          coolingLabel={simulation.coolingLabel}
        />
      </section>

      <section className="dashboard-lower dashboard-lower-compact">
        <TemperatureChart history={simulation.history} />
        <section className="panel summary-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">System summary</p>
              <h2>Current operating state</h2>
            </div>
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
              <span>Ambient temperature</span>
              <strong>{simulation.ambientTemperature.toFixed(1)} deg C</strong>
            </div>
            <div>
              <span>Route point</span>
              <strong>{simulation.location}</strong>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default Dashboard
