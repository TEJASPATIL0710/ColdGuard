const simulationService = require('../services/simulationService')
const esp32SignalService = require('../services/esp32SignalService')
const gpsService = require('../services/gpsService')
const { getConnectionState } = require('../config/db')
const logger = require('../logger/fileLogger')

function getHealth(_req, res) {
  res.json({
    ok: true,
    service: 'coldguard-server',
    timestamp: new Date().toISOString(),
    persistence: getConnectionState(),
  })
}

function getSimulation(_req, res) {
  res.json(simulationService.getSimulationState())
}

async function tickSimulation(_req, res) {
  res.json(await simulationService.stepSimulation())
}

async function injectFailure(_req, res) {
  res.json(await simulationService.triggerFailure())
}

async function restoreSimulation(_req, res) {
  res.json(await simulationService.triggerRecovery())
}

async function resetSimulation(_req, res) {
  res.json(await simulationService.resetSimulation())
}

async function updateRunningState(req, res) {
  const { isRunning } = req.body
  res.json(await simulationService.setRunning(isRunning))
}

async function getTelemetryHistory(req, res) {
  const limit = Number(req.query.limit || 120)
  const hours = req.query.hours ? Number(req.query.hours) : undefined
  const source = req.query.source ? String(req.query.source) : undefined
  const history = await simulationService.getTelemetryHistory({ limit, hours, source })

  res.json({
    limit,
    hours: hours ?? null,
    source: source ?? null,
    count: history.length,
    history,
  })
}

async function getRecentEvents(req, res) {
  const limit = Number(req.query.limit || 20)
  const events = await simulationService.getRecentEvents(limit)

  res.json({
    limit,
    count: events.length,
    events,
  })
}

async function getAnalyticsSummary(req, res) {
  const hours = Number(req.query.hours || 24)
  res.json(await simulationService.getAnalyticsSummary(hours))
}

async function getTemperatureReport(req, res) {
  const hours = Number(req.query.hours || 24)
  res.json(await simulationService.getTemperatureReport(hours))
}

async function getEsp32Signals(req, res) {
  const limit = Number(req.query.limit || 30)
  const signals = await esp32SignalService.getRecentSignals(limit)

  res.json({
    limit,
    count: signals.length,
    signals,
  })
}

async function getGpsHistory(req, res) {
  const limit = Number(req.query.limit || 50)
  const history = await gpsService.getLocationHistory(limit)

  res.json({
    limit,
    count: history.length,
    history,
  })
}

async function getLatestGps(req, res) {
  const location = await gpsService.getLatestLocation()
  res.json({ location })
}

async function ingestSensorReading(req, res) {
  logger.logIncomingSensor(req.body)
  const {
    temperature,
    ambientTemperature,
    source,
    deviceId,
    battery,
    batteryLevel,
    solar,
    timestamp,
  } = req.body

  const batteryFromNested =
    typeof battery === 'object' && battery !== null && Number.isFinite(Number(battery.level))
      ? Number(battery.level)
      : undefined
  const solarPower =
    typeof solar === 'object' && solar !== null && Number.isFinite(Number(solar.power))
      ? Number(solar.power)
      : undefined

  const payload = await simulationService.ingestSensorReading({
      temperature,
      ambientTemperature,
      source: source || deviceId,
      batteryLevel: batteryLevel ?? batteryFromNested ?? battery,
      batteryIsCharging:
        typeof battery === 'object' && battery !== null ? battery.isCharging : undefined,
      batteryStatus: typeof battery === 'object' && battery !== null ? battery.status : undefined,
      batteryEstimatedHours:
        typeof battery === 'object' && battery !== null ? battery.estimatedHours : undefined,
      solarInput: solarPower,
      solarPower,
      solarIsGenerating:
        typeof solar === 'object' && solar !== null ? solar.isGenerating : undefined,
      solarStatus: typeof solar === 'object' && solar !== null ? solar.status : undefined,
      recordedAt: timestamp,
    })

  res.json(payload)

  const io = req.app.get('io')
  const temp = Number(req.body.temperature)
  const signalBatteryLevel = req.body.battery?.level ?? req.body.batteryLevel ?? null
  const solarSignalPower = req.body.solar?.power ?? null

  esp32SignalService
    .processAndEmit(temp, signalBatteryLevel, solarSignalPower, io)
    .catch((error) => {
      logger.logServerError('ESP32 signal processing failed', error)
    })

  const gpsData = req.body.gps ?? null
  gpsService.processGpsReading(gpsData, io).catch((error) => {
    logger.logServerError('GPS processing failed', error)
  })
}

async function getSensorReadings(req, res) {
  const limit = Number(req.query.limit || 10)
  const [readings, sensors] = await Promise.all([
    simulationService.getRecentSensorReadings(limit),
    simulationService.getLatestSensorSources(limit),
  ])

  res.json({
    limit,
    count: readings.length,
    readings,
    activeSources: sensors.length,
    sensors,
  })
}

module.exports = {
  getHealth,
  getSimulation,
  tickSimulation,
  injectFailure,
  restoreSimulation,
  resetSimulation,
  updateRunningState,
  getTelemetryHistory,
  getRecentEvents,
  getAnalyticsSummary,
  getTemperatureReport,
  getEsp32Signals,
  getGpsHistory,
  getLatestGps,
  ingestSensorReading,
  getSensorReadings,
}
