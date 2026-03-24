const mysql = require('mysql2/promise')

let pool = null
let connectionState = {
  configured: false,
  connected: false,
  database: null,
  error: null,
}

function getConfig() {
  return {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE,
  }
}

function isConfigured() {
  const config = getConfig()
  return Boolean(config.host && config.user && config.database)
}

async function initializeDatabase() {
  const config = getConfig()
  connectionState = {
    configured: isConfigured(),
    connected: false,
    database: config.database || null,
    error: null,
  }

  if (!connectionState.configured) {
    connectionState.error =
      'MySQL persistence disabled. Set MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE.'
    return connectionState
  }

  let bootstrapConnection

  try {
    bootstrapConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    })

    await bootstrapConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )

    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    })

    await pool.query(`
      CREATE TABLE IF NOT EXISTS temperature_sensor_readings (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source VARCHAR(32) NOT NULL,
        temperature DECIMAL(5,2) NOT NULL,
        ambient_temperature DECIMAL(5,2) NOT NULL,
        mode VARCHAR(32) NOT NULL,
        route_label VARCHAR(128) NOT NULL,
        battery_level DECIMAL(5,2) NOT NULL,
        solar_input DECIMAL(5,2) NOT NULL,
        cooling_active BOOLEAN NOT NULL,
        action_taken VARCHAR(64) NOT NULL
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS simulation_snapshots (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        mode VARCHAR(32) NOT NULL,
        is_running BOOLEAN NOT NULL,
        temperature DECIMAL(5,2) NOT NULL,
        battery_level DECIMAL(5,2) NOT NULL,
        solar_input DECIMAL(5,2) NOT NULL,
        cooling_active BOOLEAN NOT NULL,
        ambient_temperature DECIMAL(5,2) NOT NULL,
        route_index INT NOT NULL,
        route_label VARCHAR(128) NOT NULL,
        alert_tone VARCHAR(32) NULL,
        alert_title VARCHAR(255) NULL,
        backup_hours DECIMAL(6,2) NOT NULL
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS simulation_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        event_uid VARCHAR(64) NOT NULL UNIQUE,
        level VARCHAR(32) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL
      )
    `)

    connectionState.connected = true
    return connectionState
  } catch (error) {
    connectionState.connected = false
    connectionState.error = error.message
    return connectionState
  } finally {
    if (bootstrapConnection) {
      await bootstrapConnection.end()
    }
  }
}

function getPool() {
  return pool
}

function getConnectionState() {
  return { ...connectionState }
}

async function closeDatabase() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

module.exports = {
  initializeDatabase,
  getPool,
  getConnectionState,
  closeDatabase,
}
