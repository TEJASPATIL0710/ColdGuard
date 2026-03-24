const { createLogEntry } = require('../models/LogModel')
const simulationRepository = require('../repositories/simulationRepository')
const {
  IDEAL_TEMP,
  SAFE_MAX_TEMP,
  calculateStability,
  clamp,
  deriveBatteryStatus,
  deriveTemperatureStatus,
  estimateBackupHours,
  formatClock,
  nudgeTowards,
  round,
} = require('../utils/calculations')

const TICK_MS = 1500
const PREEMPTIVE_COOLING_TEMP = 5.5
const COOLING_STANDBY_TEMP = 4.3

const ROUTE_POINTS = [
  'Hub Dispatch',
  'Pune Highway',
  'Village Clinic',
  'Field Vaccination Camp',
]

const MODE_LABELS = {
  stable: 'Stable Transit',
  failure: 'Thermal Excursion',
  recovery: 'Recovery Cycle',
}

const METRIC_CARDS = [
  { key: 'stability', label: 'Temperature stability', target: 'Target +/-0.5 deg C' },
  { key: 'backup', label: 'Backup time', target: 'Goal 24 to 72 hrs' },
  { key: 'energy', label: 'Energy use', target: 'Lower is better' },
  { key: 'carbon', label: 'Carbon reduction', target: 'Vs diesel transport' },
]

function createHistorySeed() {
  const now = Date.now()

  return Array.from({ length: 12 }, (_, index) => {
    const offset = (11 - index) * TICK_MS
    return {
      label: formatClock(new Date(now - offset)),
      temperature: round(4 + Math.sin(index / 2) * 0.2, 1),
      batteryLevel: round(96 - index * 0.2, 1),
    }
  })
}

function createInitialState() {
  const createdAt = new Date().toISOString()

  return {
    mode: 'stable',
    isRunning: true,
    temperature: 4.1,
    lastSensorReading: {
      source: 'simulated',
      temperature: 4.1,
      ambientTemperature: 31,
      actionTaken: 'monitoring',
      recordedAt: createdAt,
    },
    batteryLevel: 96,
    solarInput: 68,
    coolingActive: false,
    ambientTemperature: 31,
    coolingReason: 'Monitoring safe sensor band.',
    routeIndex: 0,
    history: createHistorySeed(),
    eventLog: [createLogEntry('ColdGuard digital twin started in stable transport mode.')],
    lastUpdated: createdAt,
  }
}

let state = createInitialState()
let engineHandle = null
let engineBusy = false

async function pushEvent(message, level = 'info') {
  const event = createLogEntry(message, level)
  state.eventLog = [event, ...state.eventLog].slice(0, 8)
  await simulationRepository.saveEvent(event)
  return event
}

function determineCoolingDecision(sensorTemperature, mode, wasCoolingActive) {
  if (mode === 'failure') {
    return {
      coolingActive: true,
      nextMode: 'failure',
      actionTaken: 'forced_cooling',
      coolingReason: 'Failure mode keeps cooling locked on while the box is unstable.',
    }
  }

  if (sensorTemperature > SAFE_MAX_TEMP) {
    return {
      coolingActive: true,
      nextMode: 'recovery',
      actionTaken: wasCoolingActive ? 'cooling_maintained' : 'cooling_activated',
      coolingReason: 'Sensor reading exceeded safe range, so cooling was engaged.',
    }
  }

  if (sensorTemperature >= PREEMPTIVE_COOLING_TEMP) {
    return {
      coolingActive: true,
      nextMode: 'stable',
      actionTaken: wasCoolingActive ? 'cooling_maintained' : 'cooling_activated',
      coolingReason: 'Sensor temperature is rising, so cooling is running preventively.',
    }
  }

  if (sensorTemperature <= COOLING_STANDBY_TEMP) {
    return {
      coolingActive: false,
      nextMode: 'stable',
      actionTaken: wasCoolingActive ? 'cooling_standby' : 'monitoring',
      coolingReason: 'Sensor temperature is back under control, so cooling is on standby.',
    }
  }

  return {
    coolingActive: wasCoolingActive,
    nextMode: mode === 'recovery' ? 'recovery' : 'stable',
    actionTaken: wasCoolingActive ? 'cooling_maintained' : 'monitoring',
    coolingReason: wasCoolingActive
      ? 'Cooling remains active while the sensor reading settles.'
      : 'Sensor reading remains in the monitored operating band.',
  }
}

function createSensorMeasurement(temperature, ambientTemperature, source = 'simulated') {
  const sensorNoise = (Math.random() - 0.5) * 0.2

  return {
    source,
    temperature: round(temperature + sensorNoise, 1),
    ambientTemperature: round(ambientTemperature, 1),
    recordedAt: new Date().toISOString(),
  }
}

function buildMetrics() {
  const backupHours = estimateBackupHours(state.batteryLevel)
  const stability = calculateStability(state.temperature)
  const energy = state.mode === 'failure' ? 284 : state.mode === 'recovery' ? 248 : 214
  const carbon = state.mode === 'failure' ? '53%' : '61%'

  return METRIC_CARDS.map((card) => {
    if (card.key === 'stability') {
      return { ...card, value: `${stability} deg C deviation` }
    }

    if (card.key === 'backup') {
      return { ...card, value: `${backupHours} hrs remaining` }
    }

    if (card.key === 'energy') {
      return { ...card, value: `${energy} Wh/day` }
    }

    return { ...card, value: carbon }
  })
}

function buildAlert() {
  const temperatureStatus = deriveTemperatureStatus(state.temperature)

  if (temperatureStatus.tone === 'safe') {
    return null
  }

  return {
    title:
      temperatureStatus.tone === 'critical'
        ? 'Immediate attention required'
        : 'Temperature trend warning',
    detail: temperatureStatus.message,
  }
}

function serializeState() {
  const temperatureStatus = deriveTemperatureStatus(state.temperature)
  const batteryStatus = deriveBatteryStatus(state.batteryLevel)

  return {
    ...state,
    modeLabel: MODE_LABELS[state.mode],
    location: ROUTE_POINTS[state.routeIndex],
    backupHours: estimateBackupHours(state.batteryLevel),
    temperatureStatus,
    batteryStatus,
    alert: buildAlert(),
    metrics: buildMetrics(),
  }
}

async function persistStateSnapshot() {
  await simulationRepository.saveSnapshot(serializeState())
}

async function persistSensorReading(sensorReading, actionTaken, coolingActive) {
  await simulationRepository.saveSensorReading({
    source: sensorReading.source,
    temperature: sensorReading.temperature,
    ambientTemperature: sensorReading.ambientTemperature,
    mode: state.mode,
    location: ROUTE_POINTS[state.routeIndex],
    batteryLevel: state.batteryLevel,
    solarInput: state.solarInput,
    coolingActive,
    actionTaken,
  })
}

async function applySensorReading(sensorReading) {
  const previousCooling = state.coolingActive
  const previousMode = state.mode
  const previousTemperature = state.temperature
  const decision = determineCoolingDecision(
    sensorReading.temperature,
    state.mode,
    previousCooling,
  )

  state = {
    ...state,
    mode: decision.nextMode,
    temperature: sensorReading.temperature,
    ambientTemperature: sensorReading.ambientTemperature,
    coolingActive: decision.coolingActive,
    coolingReason: decision.coolingReason,
    lastSensorReading: {
      ...sensorReading,
      actionTaken: decision.actionTaken,
    },
    history: [
      ...state.history,
      {
        label: formatClock(new Date(sensorReading.recordedAt)),
        temperature: sensorReading.temperature,
        batteryLevel: state.batteryLevel,
      },
    ].slice(-24),
    lastUpdated: sensorReading.recordedAt,
  }

  await persistSensorReading(sensorReading, decision.actionTaken, decision.coolingActive)

  if (!previousCooling && decision.coolingActive) {
    await pushEvent(
      `Cooling activated from sensor reading ${sensorReading.temperature} deg C.`,
      sensorReading.temperature > SAFE_MAX_TEMP ? 'warning' : 'info',
    )
  }

  if (previousCooling && !decision.coolingActive) {
    await pushEvent(
      `Cooling returned to standby after sensor reading ${sensorReading.temperature} deg C.`,
    )
  }

  if (sensorReading.temperature > SAFE_MAX_TEMP && previousTemperature <= SAFE_MAX_TEMP) {
    await pushEvent(
      `Temperature excursion detected from sensor input ${sensorReading.temperature} deg C.`,
      'warning',
    )
  }

  if (previousMode === 'recovery' && decision.nextMode === 'stable' && sensorReading.temperature <= 4.6) {
    await pushEvent('Temperature restored to vaccine-safe range. System returned to stable transit.')
  }

  return decision
}

async function stepSimulation() {
  const routeIndex = (state.routeIndex + 1) % ROUTE_POINTS.length
  let temperature = state.temperature
  let batteryLevel = state.batteryLevel
  let solarInput = state.solarInput
  let ambientTemperature = state.ambientTemperature

  if (state.mode === 'stable') {
    const target = state.coolingActive
      ? IDEAL_TEMP + (Math.random() - 0.5) * 0.2
      : IDEAL_TEMP + 0.8 + (Math.random() - 0.5) * 0.6
    temperature = nudgeTowards(state.temperature, target, 0.3)
    batteryLevel = clamp(state.batteryLevel - 0.15, 0, 100)
    solarInput = round(64 + Math.sin(Date.now() / 5000) * 8, 0)
    ambientTemperature = round(30 + Math.random() * 2, 1)
  }

  if (state.mode === 'failure') {
    temperature = nudgeTowards(state.temperature, 10.8, 0.9)
    batteryLevel = clamp(state.batteryLevel - 0.85, 0, 100)
    solarInput = round(18 + Math.random() * 8, 0)
    ambientTemperature = round(35 + Math.random() * 3, 1)
  }

  if (state.mode === 'recovery') {
    temperature = nudgeTowards(state.temperature, 4.3, state.coolingActive ? 1.2 : 0.6)
    batteryLevel = clamp(state.batteryLevel - 0.25, 0, 100)
    solarInput = round(58 + Math.random() * 10, 0)
    ambientTemperature = round(29 + Math.random() * 2, 1)
  }

  state = {
    ...state,
    batteryLevel: round(batteryLevel, 1),
    solarInput,
    routeIndex,
  }

  const sensorReading = createSensorMeasurement(temperature, ambientTemperature)
  await applySensorReading(sensorReading)

  await persistStateSnapshot()
  return serializeState()
}

function getSimulationState() {
  return serializeState()
}

async function triggerFailure() {
  state.mode = 'failure'
  state.lastUpdated = new Date().toISOString()
  await pushEvent('Failure scenario injected: seal leak and solar drop simulated.', 'warning')
  await persistStateSnapshot()
  return serializeState()
}

async function triggerRecovery() {
  state.mode = 'recovery'
  state.lastUpdated = new Date().toISOString()
  await pushEvent('Recovery command issued. Peltier boost and PCM support rebalancing cargo bay.')
  await persistStateSnapshot()
  return serializeState()
}

async function resetSimulation() {
  state = createInitialState()
  await pushEvent('Simulation reset to baseline transport conditions.')
  await persistStateSnapshot()
  return serializeState()
}

async function setRunning(shouldRun) {
  state.isRunning = Boolean(shouldRun)
  state.lastUpdated = new Date().toISOString()
  await pushEvent(
    state.isRunning
      ? 'Simulation resumed with live telemetry updates.'
      : 'Simulation paused for presentation review.',
  )
  await persistStateSnapshot()
  return serializeState()
}

async function getTelemetryHistory(options) {
  return simulationRepository.getTelemetryHistory(options)
}

async function getAnalyticsSummary(hours) {
  return simulationRepository.getAnalyticsSummary(hours)
}

async function getTemperatureReport(hours) {
  return simulationRepository.getTemperatureReport(hours)
}

async function getRecentEvents(limit) {
  return simulationRepository.getRecentEvents(limit)
}

async function ingestSensorReading({ temperature, ambientTemperature, source = 'manual' }) {
  if (!Number.isFinite(Number(temperature))) {
    throw new Error('A numeric temperature sensor reading is required.')
  }

  const sensorReading = {
    source,
    temperature: round(Number(temperature), 1),
    ambientTemperature: Number.isFinite(Number(ambientTemperature))
      ? round(Number(ambientTemperature), 1)
      : state.ambientTemperature,
    recordedAt: new Date().toISOString(),
  }

  await applySensorReading(sensorReading)
  await persistStateSnapshot()
  return serializeState()
}

async function initializePersistence() {
  await Promise.all(state.eventLog.map((event) => simulationRepository.saveEvent(event)))
  await persistStateSnapshot()
}

function startEngine() {
  if (engineHandle) {
    return
  }

  engineHandle = setInterval(() => {
    if (!state.isRunning || engineBusy) {
      return
    }

    engineBusy = true
    Promise.resolve(stepSimulation())
      .catch((error) => {
        console.error('Simulation engine tick failed:', error.message)
      })
      .finally(() => {
        engineBusy = false
      })
  }, TICK_MS)
}

function stopEngine() {
  if (!engineHandle) {
    return
  }

  clearInterval(engineHandle)
  engineHandle = null
}

module.exports = {
  getSimulationState,
  stepSimulation,
  triggerFailure,
  triggerRecovery,
  resetSimulation,
  setRunning,
  getTelemetryHistory,
  getAnalyticsSummary,
  getTemperatureReport,
  getRecentEvents,
  ingestSensorReading,
  initializePersistence,
  startEngine,
  stopEngine,
}
