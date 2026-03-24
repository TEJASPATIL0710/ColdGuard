const express = require('express')
const controller = require('../controllers/simulationController')

const router = express.Router()

router.get('/health', controller.getHealth)
router.get('/simulation', controller.getSimulation)
router.get('/simulation/history', controller.getTelemetryHistory)
router.get('/simulation/events', controller.getRecentEvents)
router.get('/analytics/summary', controller.getAnalyticsSummary)
router.get('/reports/temperature', controller.getTemperatureReport)
router.post('/simulation/tick', controller.tickSimulation)
router.post('/simulation/failure', controller.injectFailure)
router.post('/simulation/recovery', controller.restoreSimulation)
router.post('/simulation/reset', controller.resetSimulation)
router.post('/simulation/running', controller.updateRunningState)

module.exports = router
