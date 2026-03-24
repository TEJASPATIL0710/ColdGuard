const simulationService = require('../services/simulationService')
const { getConnectionState } = require('../config/db')

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
  const history = await simulationService.getTelemetryHistory({ limit, hours })

  res.json({
    limit,
    hours: hours ?? null,
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

async function ingestSensorReading(req, res) {
  const { temperature, ambientTemperature, source } = req.body
  res.json(
    await simulationService.ingestSensorReading({
      temperature,
      ambientTemperature,
      source,
    }),
  )
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
  ingestSensorReading,
}
