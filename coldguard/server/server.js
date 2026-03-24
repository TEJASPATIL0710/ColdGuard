require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { closeDatabase, getConnectionState, initializeDatabase } = require('./config/db')
const simulationRoutes = require('./routes/simulationRoutes')
const simulationService = require('./services/simulationService')

const app = express()
const PORT = Number(process.env.PORT) || 4000

app.use(
  cors({
    origin: '*',
  }),
)
app.use(express.json())

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
      'GET /api/analytics/summary',
      'GET /api/reports/temperature',
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
  console.error(err)
  res.status(500).json({
    ok: false,
    message: 'Unexpected server error.',
  })
})

let server

async function shutdown() {
  simulationService.stopEngine()
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
    console.error('Shutdown failed:', error)
    process.exit(1)
  })
})

process.on('SIGTERM', () => {
  shutdown().catch((error) => {
    console.error('Shutdown failed:', error)
    process.exit(1)
  })
})

async function bootstrap() {
  const persistence = await initializeDatabase()

  if (persistence.connected) {
    console.log(`MySQL connected: ${persistence.database}`)
    await simulationService.initializePersistence()
  } else {
    console.warn(`MySQL unavailable: ${persistence.error}`)
  }

  simulationService.startEngine()

  server = app.listen(PORT, () => {
    console.log(`ColdGuard server listening on port ${PORT}`)
  })
}

bootstrap().catch((error) => {
  console.error('Server bootstrap failed:', error)
  process.exit(1)
})
