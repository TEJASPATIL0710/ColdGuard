const { getPool, getConnectionState } = require('../config/db')

function toMySqlDateTime(value) {
  const date = new Date(value)
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function normalizeLimit(value, fallback) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.min(Math.floor(parsed), 1000)
}

async function saveSnapshot(snapshot) {
  const pool = getPool()

  if (!pool) {
    return false
  }

  await pool.execute(
    `
      INSERT INTO simulation_snapshots (
        mode,
        is_running,
        temperature,
        battery_level,
        solar_input,
        cooling_active,
        ambient_temperature,
        route_index,
        route_label,
        alert_tone,
        alert_title,
        backup_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      snapshot.mode,
      snapshot.isRunning,
      snapshot.temperature,
      snapshot.batteryLevel,
      snapshot.solarInput,
      snapshot.coolingActive,
      snapshot.ambientTemperature,
      snapshot.routeIndex,
      snapshot.location,
      snapshot.alert ? snapshot.temperatureStatus.tone : null,
      snapshot.alert ? snapshot.alert.title : null,
      snapshot.backupHours,
    ],
  )

  return true
}

async function saveEvent(event) {
  const pool = getPool()

  if (!pool) {
    return false
  }

  await pool.execute(
    `
      INSERT INTO simulation_events (event_uid, level, message, created_at)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        level = VALUES(level),
        message = VALUES(message),
        created_at = VALUES(created_at)
    `,
    [event.id, event.level, event.message, toMySqlDateTime(event.createdAt)],
  )

  return true
}

async function getTelemetryHistory({ limit = 120, hours } = {}) {
  const pool = getPool()

  if (!pool) {
    return []
  }

  let query = `
    SELECT
      recorded_at AS recordedAt,
      temperature,
      battery_level AS batteryLevel,
      solar_input AS solarInput,
      mode,
      route_label AS location,
      cooling_active AS coolingActive
    FROM simulation_snapshots
  `
  const params = []
  const safeLimit = normalizeLimit(limit, 120)

  if (hours) {
    query += ` WHERE recorded_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)`
    params.push(hours)
  }

  query += ` ORDER BY recorded_at DESC LIMIT ${safeLimit}`

  const [rows] = await pool.execute(query, params)
  return rows.reverse()
}

async function getRecentEvents(limit = 20) {
  const pool = getPool()

  if (!pool) {
    return []
  }

  const safeLimit = normalizeLimit(limit, 20)

  const [rows] = await pool.execute(
    `
      SELECT
        event_uid AS id,
        level,
        message,
        created_at AS createdAt
      FROM simulation_events
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    `,
  )

  return rows
}

async function getAnalyticsSummary(hours = 24) {
  const pool = getPool()

  if (!pool) {
    return {
      persistence: getConnectionState(),
      summary: null,
    }
  }

  const [rows] = await pool.execute(
    `
      SELECT
        COUNT(*) AS sampleCount,
        ROUND(MIN(temperature), 2) AS minTemperature,
        ROUND(MAX(temperature), 2) AS maxTemperature,
        ROUND(AVG(temperature), 2) AS avgTemperature,
        ROUND(AVG(battery_level), 2) AS avgBatteryLevel,
        ROUND(AVG(solar_input), 2) AS avgSolarInput,
        SUM(CASE WHEN temperature < 2 OR temperature > 8 THEN 1 ELSE 0 END) AS excursionCount,
        ROUND(AVG(CASE WHEN cooling_active THEN 1 ELSE 0 END) * 100, 2) AS coolingDutyCycle
      FROM simulation_snapshots
      WHERE recorded_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)
    `,
    [Number(hours)],
  )

  return {
    persistence: getConnectionState(),
    hours: Number(hours),
    summary: rows[0],
  }
}

async function getTemperatureReport(hours = 24) {
  const pool = getPool()

  if (!pool) {
    return {
      persistence: getConnectionState(),
      hours: Number(hours),
      summary: null,
      trend: [],
      alerts: [],
    }
  }

  const analytics = await getAnalyticsSummary(hours)

  const [trendRows] = await pool.execute(
    `
      SELECT
        DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00') AS bucket,
        ROUND(AVG(temperature), 2) AS avgTemperature,
        ROUND(MIN(temperature), 2) AS minTemperature,
        ROUND(MAX(temperature), 2) AS maxTemperature,
        ROUND(AVG(battery_level), 2) AS avgBatteryLevel,
        COUNT(*) AS sampleCount
      FROM simulation_snapshots
      WHERE recorded_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)
      GROUP BY DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00')
      ORDER BY bucket ASC
    `,
    [Number(hours)],
  )

  const [alertRows] = await pool.execute(
    `
      SELECT
        recorded_at AS recordedAt,
        temperature,
        route_label AS location,
        alert_tone AS alertTone,
        alert_title AS alertTitle
      FROM simulation_snapshots
      WHERE recorded_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)
        AND alert_tone IS NOT NULL
      ORDER BY recorded_at DESC
      LIMIT 50
    `,
    [Number(hours)],
  )

  return {
    persistence: getConnectionState(),
    hours: Number(hours),
    summary: analytics.summary,
    trend: trendRows,
    alerts: alertRows,
  }
}

module.exports = {
  saveSnapshot,
  saveEvent,
  getTelemetryHistory,
  getRecentEvents,
  getAnalyticsSummary,
  getTemperatureReport,
}
