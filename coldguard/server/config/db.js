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

async function ensureColumn(pool, tableName, columnName, definition) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName])

  if (rows.length > 0) {
    return
  }

  await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`)
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
        battery_is_charging BOOLEAN NOT NULL DEFAULT FALSE,
        battery_status VARCHAR(32) NULL,
        battery_estimated_hours DECIMAL(6,2) NULL,
        solar_input DECIMAL(5,2) NOT NULL,
        solar_power DECIMAL(8,2) NULL,
        solar_is_generating BOOLEAN NOT NULL DEFAULT FALSE,
        solar_status VARCHAR(32) NULL,
        cooling_active BOOLEAN NOT NULL,
        action_taken VARCHAR(64) NOT NULL
      )
    `)

    await ensureColumn(
      pool,
      'temperature_sensor_readings',
      'battery_is_charging',
      '`battery_is_charging` BOOLEAN NOT NULL DEFAULT FALSE',
    )
    await ensureColumn(
      pool,
      'temperature_sensor_readings',
      'battery_status',
      '`battery_status` VARCHAR(32) NULL',
    )
    await ensureColumn(
      pool,
      'temperature_sensor_readings',
      'battery_estimated_hours',
      '`battery_estimated_hours` DECIMAL(6,2) NULL',
    )
    await ensureColumn(
      pool,
      'temperature_sensor_readings',
      'solar_power',
      '`solar_power` DECIMAL(8,2) NULL',
    )
    await ensureColumn(
      pool,
      'temperature_sensor_readings',
      'solar_is_generating',
      '`solar_is_generating` BOOLEAN NOT NULL DEFAULT FALSE',
    )
    await ensureColumn(
      pool,
      'temperature_sensor_readings',
      'solar_status',
      '`solar_status` VARCHAR(32) NULL',
    )

    await pool.query(`
      CREATE TABLE IF NOT EXISTS simulation_snapshots (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        mode VARCHAR(32) NOT NULL,
        is_running BOOLEAN NOT NULL,
        temperature DECIMAL(5,2) NOT NULL,
        battery_level DECIMAL(5,2) NOT NULL,
        battery_is_charging BOOLEAN NOT NULL DEFAULT FALSE,
        battery_status VARCHAR(32) NULL,
        battery_estimated_hours DECIMAL(6,2) NULL,
        solar_input DECIMAL(5,2) NOT NULL,
        solar_power DECIMAL(8,2) NULL,
        solar_is_generating BOOLEAN NOT NULL DEFAULT FALSE,
        solar_status VARCHAR(32) NULL,
        cooling_active BOOLEAN NOT NULL,
        ambient_temperature DECIMAL(5,2) NOT NULL,
        route_index INT NOT NULL,
        route_label VARCHAR(128) NOT NULL,
        alert_tone VARCHAR(32) NULL,
        alert_title VARCHAR(255) NULL,
        backup_hours DECIMAL(6,2) NOT NULL
      )
    `)

    await ensureColumn(
      pool,
      'simulation_snapshots',
      'battery_is_charging',
      '`battery_is_charging` BOOLEAN NOT NULL DEFAULT FALSE',
    )
    await ensureColumn(
      pool,
      'simulation_snapshots',
      'battery_status',
      '`battery_status` VARCHAR(32) NULL',
    )
    await ensureColumn(
      pool,
      'simulation_snapshots',
      'battery_estimated_hours',
      '`battery_estimated_hours` DECIMAL(6,2) NULL',
    )
    await ensureColumn(
      pool,
      'simulation_snapshots',
      'solar_power',
      '`solar_power` DECIMAL(8,2) NULL',
    )
    await ensureColumn(
      pool,
      'simulation_snapshots',
      'solar_is_generating',
      '`solar_is_generating` BOOLEAN NOT NULL DEFAULT FALSE',
    )
    await ensureColumn(
      pool,
      'simulation_snapshots',
      'solar_status',
      '`solar_status` VARCHAR(32) NULL',
    )

    await pool.query(`
      CREATE TABLE IF NOT EXISTS simulation_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        event_uid VARCHAR(64) NOT NULL UNIQUE,
        level VARCHAR(32) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS esp32_signals (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        temperature DECIMAL(5,2) NOT NULL,
        trigger_type VARCHAR(32) NOT NULL,
        cmd VARCHAR(64) NOT NULL,
        pin VARCHAR(16) NOT NULL,
        state VARCHAR(8) NOT NULL,
        pwm TINYINT UNSIGNED NOT NULL DEFAULT 0,
        duration_ms INT NULL,
        blink_hz DECIMAL(4,1) NULL,
        reason VARCHAR(255) NOT NULL
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gps_locations (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source VARCHAR(64) NOT NULL,
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        accuracy DECIMAL(8, 2) NULL,
        speed DECIMAL(6, 2) NULL DEFAULT 0,
        heading DECIMAL(5, 2) NULL DEFAULT 0,
        address VARCHAR(255) NULL,
        city VARCHAR(128) NULL,
        region VARCHAR(128) NULL,
        country VARCHAR(64) NULL
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
