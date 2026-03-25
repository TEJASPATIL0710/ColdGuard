require('dotenv').config()

const http = require('http')
const express = require('express')
const cors = require('cors')
const { Server } = require('socket.io')
const { closeDatabase, getConnectionState, initializeDatabase } = require('./config/db')
const simulationRoutes = require('./routes/simulationRoutes')
const simulationService = require('./services/simulationService')
const mqttTemperatureService = require('./services/mqttTemperatureService')
const logger = require('./logger/fileLogger')

const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
})
const PORT = Number(process.env.PORT) || 4000

app.set('io', io)

app.use(
  cors({
    origin: '*',
  }),
)
app.use(express.json())

io.on('connection', (socket) => {
  socket.emit('simulation_state', simulationService.getSimulationState())
})

app.get('/', (_req, res) => {
  const persistence = getConnectionState()

  res.json({
    name: 'ColdGuard simulation backend',
    version: '1.0.0',
    persistence,
    routes: [
      'GET /api/health',
      'GET /api/simulation',
      'GET /api/simulation/history',
      'GET /api/simulation/events',
      'GET /api/esp32/signals',
      'GET /api/gps/history',
      'GET /api/gps/latest',
      'GET /api/analytics/summary',
      'GET /api/reports/temperature',
      'POST /api/simulation/sensor-reading',
      'POST /api/simulation/tick',
      'POST /api/simulation/failure',
      'POST /api/simulation/recovery',
      'POST /api/simulation/reset',
      'POST /api/simulation/running',
    ],
  })
})

app.use('/api', simulationRoutes)

app.use((err, _req, res, _next) => {
  logger.logServerError('Express request error', err)
  res.status(500).json({
    ok: false,
    message: 'Unexpected server error.',
  })
})

let server

async function shutdown() {
  simulationService.stopEngine()
  mqttTemperatureService.stop()
  await closeDatabase()

  if (!server) {
    process.exit(0)
    return
  }

  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', () => {
  shutdown().catch((error) => {
    logger.logServerError('Shutdown failed during SIGINT', error)
    process.exit(1)
  })
})

process.on('SIGTERM', () => {
  shutdown().catch((error) => {
    logger.logServerError('Shutdown failed during SIGTERM', error)
    process.exit(1)
  })
})

async function bootstrap() {
  const persistence = await initializeDatabase()

  if (persistence.connected) {
    logger.logServerEvent('MySQL connected', { database: persistence.database })
    await simulationService.initializePersistence()
  } else {
    logger.logServerEvent('MySQL unavailable', { error: persistence.error })
  }

  simulationService.startEngine(io)
  mqttTemperatureService.start()

  server = httpServer.listen(PORT, () => {
    logger.logServerEvent('ColdGuard server listening', { port: PORT })
  })
}

bootstrap().catch((error) => {
  logger.logServerError('Server bootstrap failed', error)
  process.exit(1)
})
