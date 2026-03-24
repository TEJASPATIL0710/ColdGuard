const { getPool } = require('../config/db')
const logger = require('../logger/fileLogger')

const PIN = {
  COOLER: 'GPIO_14',
  FAN: 'GPIO_27',
  HEATER: 'GPIO_33',
  BUZZER: 'GPIO_26',
  BATTERY_LED: 'GPIO_25',
  SOLAR_LED: 'GPIO_32',
}

function buildCommands(temperature, batteryLevel, solarPower) {
  const commands = []
  let triggerType = 'NORMAL'

  if (temperature > 8) {
    triggerType = 'HIGH_TEMP'
    commands.push({
      cmd: 'COOLING_BOOST',
      pin: PIN.COOLER,
      state: 'HIGH',
      pwm: 255,
      duration_ms: null,
      blink_hz: null,
      reason: 'Temperature exceeded 8C upper limit',
    })
    commands.push({
      cmd: 'FAN_SPEED_HIGH',
      pin: PIN.FAN,
      state: 'HIGH',
      pwm: 200,
      duration_ms: null,
      blink_hz: null,
      reason: 'Increase airflow for cooling',
    })
    commands.push({
      cmd: 'BUZZER_ALERT',
      pin: PIN.BUZZER,
      state: 'HIGH',
      pwm: 0,
      duration_ms: 1000,
      blink_hz: null,
      reason: 'Audible alert - high temperature',
    })
  } else if (temperature < 2) {
    triggerType = 'LOW_TEMP'
    commands.push({
      cmd: 'COOLING_OFF',
      pin: PIN.COOLER,
      state: 'LOW',
      pwm: 0,
      duration_ms: null,
      blink_hz: null,
      reason: 'Temperature below 2C - stop cooling',
    })
    commands.push({
      cmd: 'HEATER_ON',
      pin: PIN.HEATER,
      state: 'HIGH',
      pwm: 180,
      duration_ms: null,
      blink_hz: null,
      reason: 'Prevent cargo freezing',
    })
    commands.push({
      cmd: 'BUZZER_ALERT',
      pin: PIN.BUZZER,
      state: 'HIGH',
      pwm: 0,
      duration_ms: 500,
      blink_hz: null,
      reason: 'Audible alert - low temperature',
    })
  } else {
    triggerType = 'NORMAL'
    commands.push({
      cmd: 'COOLING_NORMAL',
      pin: PIN.COOLER,
      state: temperature > 5.5 ? 'HIGH' : 'LOW',
      pwm: temperature > 5.5 ? 120 : 0,
      duration_ms: null,
      blink_hz: null,
      reason: 'Temperature in safe range',
    })
    commands.push({
      cmd: 'FAN_SPEED_LOW',
      pin: PIN.FAN,
      state: 'HIGH',
      pwm: 60,
      duration_ms: null,
      blink_hz: null,
      reason: 'Maintain baseline airflow',
    })
    commands.push({
      cmd: 'BUZZER_OFF',
      pin: PIN.BUZZER,
      state: 'LOW',
      pwm: 0,
      duration_ms: 0,
      blink_hz: null,
      reason: 'No alert needed',
    })
  }

  if (batteryLevel !== null && batteryLevel < 20) {
    commands.push({
      cmd: 'BATTERY_LOW_LED',
      pin: PIN.BATTERY_LED,
      state: 'HIGH',
      pwm: 0,
      duration_ms: null,
      blink_hz: 2.0,
      reason: 'Battery below 20% - visual warning',
    })
  } else {
    commands.push({
      cmd: 'BATTERY_OK_LED',
      pin: PIN.BATTERY_LED,
      state: 'LOW',
      pwm: 0,
      duration_ms: null,
      blink_hz: null,
      reason: 'Battery level normal',
    })
  }

  if (solarPower === 0 || solarPower === null) {
    commands.push({
      cmd: 'SOLAR_FAULT_LED',
      pin: PIN.SOLAR_LED,
      state: 'HIGH',
      pwm: 0,
      duration_ms: null,
      blink_hz: 1.0,
      reason: 'No solar input detected',
    })
  } else {
    commands.push({
      cmd: 'SOLAR_OK_LED',
      pin: PIN.SOLAR_LED,
      state: 'LOW',
      pwm: 0,
      duration_ms: null,
      blink_hz: null,
      reason: 'Solar generating normally',
    })
  }

  commands.push({
    cmd: 'WATCHDOG_FEED',
    pin: 'INTERNAL',
    state: 'PULSE',
    pwm: 0,
    duration_ms: null,
    blink_hz: null,
    reason: 'Keep ESP32 watchdog timer alive',
  })

  return { triggerType, commands }
}

async function saveSignals(temperature, triggerType, commands) {
  const pool = getPool()

  if (!pool) {
    return
  }

  await Promise.all(
    commands.map((command) =>
      pool.query(
        `INSERT INTO esp32_signals
          (temperature, trigger_type, cmd, pin, state, pwm, duration_ms, blink_hz, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          temperature,
          triggerType,
          command.cmd,
          command.pin,
          command.state,
          command.pwm ?? 0,
          command.duration_ms ?? null,
          command.blink_hz ?? null,
          command.reason,
        ],
      ),
    ),
  )
}

async function getRecentSignals(limit = 30) {
  const pool = getPool()

  if (!pool) {
    return []
  }

  const [rows] = await pool.query(
    `SELECT * FROM esp32_signals ORDER BY recorded_at DESC LIMIT ?`,
    [limit],
  )

  return rows
}

async function processAndEmit(temperature, batteryLevel, solarPower, io) {
  const { triggerType, commands } = buildCommands(temperature, batteryLevel, solarPower)

  logger.logOutgoingEsp32({
    temperature,
    batteryLevel,
    solarPower,
    triggerType,
    commands,
  })

  await saveSignals(temperature, triggerType, commands)

  if (io) {
    io.emit('esp32_signals', {
      timestamp: new Date().toISOString(),
      temperature,
      triggerType,
      commands,
    })
  }

  return { triggerType, commands }
}

module.exports = { processAndEmit, getRecentSignals }
