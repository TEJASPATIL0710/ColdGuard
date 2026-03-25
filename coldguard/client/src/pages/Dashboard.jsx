import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import BatteryCard from '../components/dashboard/BatteryCard'
import CoolingPerformanceCard from '../components/dashboard/CoolingPerformanceCard'
import EnergyUsageCard from '../components/dashboard/EnergyUsageCard'
import TemperatureCard from '../components/dashboard/TemperatureCard'
import TemperatureChart from '../components/dashboard/TemperatureChart'
import { useSimulationContext } from '../context/SimulationContext'

function formatBatteryValue(value) {
  return value === null ? 'N/A' : `${value.toFixed(1)}%`
}

function formatSummaryValue(value) {
  return value === null || value === undefined || value === '' ? '-' : value
}

function groupSignalRows(rows) {
  const grouped = []
  const bucket = new Map()

  for (const signal of rows || []) {
    const key = `${signal.recorded_at}|${signal.trigger_type}|${signal.temperature}`

    if (!bucket.has(key)) {
      const entry = {
        timestamp: signal.recorded_at,
        temperature: Number(signal.temperature),
        triggerType: signal.trigger_type,
        commands: [],
      }

      bucket.set(key, entry)
      grouped.push(entry)
    }

    bucket.get(key).commands.push({
      cmd: signal.cmd,
      pin: signal.pin,
      state: signal.state,
      pwm: Number(signal.pwm),
      duration_ms: signal.duration_ms,
      blink_hz: signal.blink_hz === null ? null : Number(signal.blink_hz),
      reason: signal.reason,
    })
  }

  return grouped
}

function Dashboard() {
  const simulation = useSimulationContext()
  const [thresholdAlerts, setThresholdAlerts] = useState([])
  const [signalLog, setSignalLog] = useState([])
  const [gpsLocation, setGpsLocation] = useState(null)
  const [gpsTrail, setGpsTrail] = useState([])
  const sensorSource =
    simulation.sensorFeedSource || simulation.lastSensorReading?.source || 'awaiting'
  const lastPacketLabel =
    simulation.lastSensorReading?.recordedAt ?? 'Waiting for sensor feed'
  const chartHistory =
    simulation.history?.map((point, index, points) =>
      index === points.length - 1
        ? { ...point, label: simulation.lastSensorReading?.recordedAt ?? point.label }
        : point,
    ) ?? []

  useEffect(() => {
    let isActive = true
    const socket = io('http://localhost:4000')

    const loadDashboardSideData = async () => {
      try {
        const [signalResponse, gpsResponse] = await Promise.all([
          fetch('http://localhost:4000/api/esp32/signals?limit=20'),
          fetch('http://localhost:4000/api/gps/latest'),
        ])
        const signalData = await signalResponse.json()
        const gpsData = await gpsResponse.json()

        if (!isActive) {
          return
        }

        setSignalLog(groupSignalRows(signalData.signals).slice(0, 20))

        if (gpsData.location) {
          const latestLocation = {
            ...gpsData.location,
            timestamp: gpsData.location.recorded_at || gpsData.location.timestamp || null,
          }

          setGpsLocation(latestLocation)
          setGpsTrail((current) => [
            ...current.slice(-20),
            {
              lat: Number(latestLocation.latitude),
              lng: Number(latestLocation.longitude),
            },
          ])
        }
      } catch (_error) {
        // Keep live panels quiet if background fetches are unavailable.
      }
    }

    socket.on('threshold_alert', (alert) => {
      setThresholdAlerts((current) => [alert, ...current].slice(0, 5))
    })

    socket.on('esp32_signals', (entry) => {
      setSignalLog((current) => [entry, ...current].slice(0, 20))
    })

    socket.on('gps_update', (data) => {
      setGpsLocation(data)
      setGpsTrail((current) => [
        ...current.slice(-20),
        {
          lat: Number(data.latitude),
          lng: Number(data.longitude),
        },
      ])
    })

    loadDashboardSideData()

    return () => {
      isActive = false
      socket.disconnect()
    }
  }, [])

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

      {thresholdAlerts.length > 0 && (
        <article className="panel alert-panel alert-active">
          <p className="eyebrow">Threshold breach</p>
          <h2>Temperature alert</h2>
          {thresholdAlerts.map((alert, index) => (
            <div key={index} className="panel-copy">
              <span>{alert.message}</span>
              <span>{new Date(alert.timestamp).toLocaleTimeString('en-IN')}</span>
            </div>
          ))}
          <button onClick={() => setThresholdAlerts([])}>Dismiss all</button>
        </article>
      )}

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
        <div className="dashboard-column">
          <TemperatureChart
            history={chartHistory}
            solarPower={simulation.solarPower}
            solarIsGenerating={simulation.solarIsGenerating}
            solarStatus={simulation.solarStatus}
            actionTaken={simulation.lastSensorReading?.actionTaken}
          />

          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Hardware telemetry</p>
                <h2>ESP32 signal feed</h2>
              </div>
              <span
                className={`tone-pill ${
                  signalLog[0]?.triggerType === 'HIGH_TEMP'
                    ? 'tone-critical'
                    : signalLog[0]?.triggerType === 'LOW_TEMP'
                      ? 'tone-warning'
                      : 'tone-safe'
                }`}
              >
                {signalLog[0]?.triggerType ?? 'WAITING'}
              </span>
            </div>

            <div className="sensor-feed-list">
              {signalLog.length === 0 ? (
                <p className="panel-copy">Waiting for ESP32 signal packets...</p>
              ) : (
                signalLog.slice(0, 5).map((entry, index) => (
                  <div className="sensor-feed-item" key={index}>
                    <div>
                      <span>Time</span>
                      <strong>{new Date(entry.timestamp).toLocaleTimeString('en-IN')}</strong>
                    </div>
                    <div>
                      <span>Trigger</span>
                      <strong>{entry.triggerType}</strong>
                    </div>
                    <div>
                      <span>Temp</span>
                      <strong>{entry.temperature} deg C</strong>
                    </div>
                    <div>
                      <span>Commands sent</span>
                      <strong>{entry.commands.length}</strong>
                    </div>
                    {entry.commands
                      .filter((command) => command.cmd !== 'WATCHDOG_FEED')
                      .map((command, commandIndex) => (
                        <div key={commandIndex}>
                          <span>{command.pin}</span>
                          <strong>
                            {`${command.cmd} -> ${command.state}`}
                            {command.pwm ? ` PWM:${command.pwm}` : ''}
                          </strong>
                        </div>
                      ))}
                  </div>
                ))
              )}
            </div>
          </article>
        </div>

        <div className="dashboard-column">
          {gpsLocation && (
            <article className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Live tracking</p>
                  <h2>Consignment GPS location</h2>
                </div>
                <span className="tone-pill tone-safe">Live</span>
              </div>

              <div className="summary-grid" style={{ marginBottom: '1rem' }}>
                <div>
                  <span>City</span>
                  <strong>{gpsLocation.city ?? '-'}</strong>
                </div>
                <div>
                  <span>Region</span>
                  <strong>{gpsLocation.region ?? '-'}</strong>
                </div>
                <div>
                  <span>Latitude</span>
                  <strong>{Number(gpsLocation.latitude).toFixed(5)}</strong>
                </div>
                <div>
                  <span>Longitude</span>
                  <strong>{Number(gpsLocation.longitude).toFixed(5)}</strong>
                </div>
                <div>
                  <span>Speed</span>
                  <strong>{gpsLocation.speed ?? 0} km/h</strong>
                </div>
                <div>
                  <span>Heading</span>
                  <strong>{gpsLocation.heading ?? 0} deg</strong>
                </div>
                <div>
                  <span>Source</span>
                  <strong>{gpsLocation.source ?? '-'}</strong>
                </div>
                <div>
                  <span>Last fix</span>
                  <strong>
                    {gpsLocation.timestamp
                      ? new Date(gpsLocation.timestamp).toLocaleTimeString('en-IN')
                      : '-'}
                  </strong>
                </div>
              </div>

              <iframe
                title="GPS Map"
                width="100%"
                height="320"
                style={{ border: 'none', borderRadius: '22px' }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                  Number(gpsLocation.longitude) - 0.01
                },${
                  Number(gpsLocation.latitude) - 0.01
                },${
                  Number(gpsLocation.longitude) + 0.01
                },${
                  Number(gpsLocation.latitude) + 0.01
                }&layer=mapnik&marker=${gpsLocation.latitude},${gpsLocation.longitude}`}
              />

              <p className="panel-copy" style={{ marginTop: '0.5rem' }}>
                {gpsLocation.address ?? `${gpsLocation.city}, ${gpsLocation.region}`}
                {' - '}Accuracy +/-{gpsLocation.accuracy ?? '-'}m
                {' - '}{gpsTrail.length} points in trail
              </p>
            </article>
          )}

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
                <strong>{formatSummaryValue(simulation.modeLabel)}</strong>
              </div>
              <div>
                <span>Cooling state</span>
                <strong>
                  {simulation.temperature === null
                    ? '-'
                    : simulation.coolingActive
                      ? 'ON'
                      : 'Standby'}
                </strong>
              </div>
              <div>
                <span>Solar condition</span>
                <strong>{formatSummaryValue(simulation.solarStatus)}</strong>
              </div>
              <div>
                <span>Sensor source</span>
                <strong>{formatSummaryValue(sensorSource)}</strong>
              </div>
              <div>
                <span>Last action</span>
                <strong>{formatSummaryValue(simulation.lastSensorReading?.actionTaken)}</strong>
              </div>
              <div>
                <span>Last packet</span>
                <strong>{simulation.lastSensorReading?.recordedAt ? lastPacketLabel : '-'}</strong>
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
        </div>
      </section>
    </main>
  )
}

export default Dashboard
