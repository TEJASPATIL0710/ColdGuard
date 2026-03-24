const { getPool } = require('../config/db')
const logger = require('../logger/fileLogger')

function simulateMovement(baseLat, baseLng, tickCount) {
  const routeRadius = 0.008
  const angle = (tickCount * 0.08) % (2 * Math.PI)
  const lat = baseLat + routeRadius * Math.sin(angle)
  const lng = baseLng + routeRadius * Math.cos(angle)
  const speed = 15 + Math.sin(tickCount * 0.3) * 8
  const heading = (angle * 180) / Math.PI + 90

  return {
    latitude: Number(lat.toFixed(7)),
    longitude: Number(lng.toFixed(7)),
    speed: Number(speed.toFixed(1)),
    heading: Number((heading % 360).toFixed(1)),
  }
}

let tickCount = 0
let baseLocation = null

async function saveLocation(locationData) {
  const pool = getPool()

  if (!pool) {
    return
  }

  await pool.query(
    `INSERT INTO gps_locations
      (source, latitude, longitude, accuracy, speed, heading, address, city, region, country)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      locationData.source,
      locationData.latitude,
      locationData.longitude,
      locationData.accuracy ?? null,
      locationData.speed ?? 0,
      locationData.heading ?? 0,
      locationData.address ?? null,
      locationData.city ?? null,
      locationData.region ?? null,
      locationData.country ?? null,
    ],
  )
}

async function getLocationHistory(limit = 50) {
  const pool = getPool()

  if (!pool) {
    return []
  }

  const [rows] = await pool.query(
    `SELECT * FROM gps_locations ORDER BY recorded_at DESC LIMIT ?`,
    [limit],
  )

  return rows
}

async function getLatestLocation() {
  const pool = getPool()

  if (!pool) {
    return null
  }

  const [rows] = await pool.query(`SELECT * FROM gps_locations ORDER BY recorded_at DESC LIMIT 1`)
  return rows[0] ?? null
}

async function processGpsReading(gpsData, io) {
  tickCount += 1

  let location = null

  if (gpsData && gpsData.latitude && gpsData.longitude) {
    if (!baseLocation) {
      baseLocation = {
        lat: Number(gpsData.latitude),
        lng: Number(gpsData.longitude),
      }
    }

    const movement = simulateMovement(baseLocation.lat, baseLocation.lng, tickCount)
    location = {
      source: gpsData.source || 'microservice',
      latitude: movement.latitude,
      longitude: movement.longitude,
      accuracy: gpsData.accuracy ?? 15,
      speed: movement.speed,
      heading: movement.heading,
      address: gpsData.address ?? null,
      city: gpsData.city ?? null,
      region: gpsData.region ?? null,
      country: gpsData.country ?? null,
    }
  } else if (baseLocation) {
    const movement = simulateMovement(baseLocation.lat, baseLocation.lng, tickCount)
    location = {
      source: 'simulated',
      latitude: movement.latitude,
      longitude: movement.longitude,
      accuracy: null,
      speed: movement.speed,
      heading: movement.heading,
      address: null,
      city: null,
      region: null,
      country: null,
    }
  }

  if (!location) {
    return null
  }

  await saveLocation(location)

  const payload = {
    ...location,
    timestamp: new Date().toISOString(),
    tickCount,
  }

  if (io) {
    io.emit('gps_update', payload)
  }

  logger.logServerEvent('GPS update emitted', payload)
  return payload
}

module.exports = { processGpsReading, getLocationHistory, getLatestLocation }
