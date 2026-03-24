const express = require('express')
const controller = require('../controllers/simulationController')

const router = express.Router()

router.get('/health', controller.getHealth)
router.get('/simulation', controller.getSimulation)
router.get('/simulation/history', controller.getTelemetryHistory)
router.get('/simulation/sensor-readings', controller.getSensorReadings)
router.get('/simulation/events', controller.getRecentEvents)
router.get('/esp32/signals', controller.getEsp32Signals)
router.get('/gps/history', controller.getGpsHistory)
router.get('/gps/latest', controller.getLatestGps)
router.get('/analytics/summary', controller.getAnalyticsSummary)
router.get('/reports/temperature', controller.getTemperatureReport)
router.post('/simulation/sensor-reading', controller.ingestSensorReading)
router.post('/simulation/tick', controller.tickSimulation)
router.post('/simulation/failure', controller.injectFailure)
router.post('/simulation/recovery', controller.restoreSimulation)
router.post('/simulation/reset', controller.resetSimulation)
router.post('/simulation/running', controller.updateRunningState)

module.exports = router
