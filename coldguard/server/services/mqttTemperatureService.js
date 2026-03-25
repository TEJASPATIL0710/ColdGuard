const simulationService = require('./simulationService')
const logger = require('../logger/fileLogger')

let client = null
let started = false

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true
    }

    if (value.toLowerCase() === 'false') {
      return false
    }
  }

  return fallback
}

function getConfig() {
  return {
    enabled: toBoolean(process.env.MQTT_ENABLED, true),
    protocol: process.env.MQTT_PROTOCOL || 'wss',
    host: process.env.MQTT_HOST || 'mqtt-dashboard.com',
    port: Number(process.env.MQTT_PORT || 8884),
    url: process.env.MQTT_URL || '',
    path: process.env.MQTT_PATH || '/mqtt',
    topic: process.env.MQTT_TOPIC || 'temperature',
    clientId:
      process.env.MQTT_CLIENT_ID || `coldguard-bridge-${Math.random().toString(16).slice(2, 8)}`,
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    keepalive: Number(process.env.MQTT_KEEPALIVE || 60),
    clean: toBoolean(process.env.MQTT_CLEAN_SESSION, true),
  }
}

function getBrokerUrl(config) {
  if (config.url) {
    return config.url
  }

  const normalizedPath = config.path
    ? config.path.startsWith('/')
      ? config.path
      : `/${config.path}`
    : ''

  const isWebSocketProtocol = config.protocol === 'ws' || config.protocol === 'wss'
  return `${config.protocol}://${config.host}:${config.port}${isWebSocketProtocol ? normalizedPath : ''}`
}

function parseMessage(messageBuffer) {
  const raw = messageBuffer.toString('utf8').trim()

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    const numericValue = Number(raw)
    return Number.isFinite(numericValue) ? { temperature: numericValue } : { value: raw }
  }
}

function extractTemperaturePayload(parsed, topic) {
  if (parsed === null || parsed === undefined) {
    return null
  }

  if (typeof parsed === 'number') {
    return {
      temperature: parsed,
      source: `mqtt:${topic}`,
      recordedAt: Date.now(),
    }
  }

  if (typeof parsed !== 'object') {
    const numericValue = Number(parsed)

    if (!Number.isFinite(numericValue)) {
      return null
    }

    return {
      temperature: numericValue,
      source: `mqtt:${topic}`,
      recordedAt: Date.now(),
    }
  }

  const candidateTemperature = [
    parsed.temperature,
    parsed.temp,
    parsed.cargoTemperature,
    parsed.value,
  ].find((value) => Number.isFinite(Number(value)))

  if (!Number.isFinite(Number(candidateTemperature))) {
    return null
  }

  return {
    temperature: Number(candidateTemperature),
    source: parsed.deviceId || parsed.sensorId || parsed.source || `mqtt:${topic}`,
    recordedAt: parsed.timestamp || parsed.recordedAt || Date.now(),
  }
}

async function handleMessage(topic, messageBuffer) {
  const parsed = parseMessage(messageBuffer)
  const temperaturePayload = extractTemperaturePayload(parsed, topic)

  logger.logIncomingSensor({
    transport: 'mqtt',
    topic,
    payload: parsed,
  })

  if (!temperaturePayload) {
    logger.logServerEvent('MQTT message ignored: no numeric temperature found', {
      topic,
      payload: parsed,
    })
    return
  }

  await simulationService.ingestSensorReading(temperaturePayload)
}

function start() {
  if (started || client) {
    return
  }

  const config = getConfig()

  if (!config.enabled || !config.topic) {
    logger.logServerEvent('MQTT bridge disabled', {
      enabled: config.enabled,
      topic: config.topic || null,
    })
    return
  }

  const brokerUrl = getBrokerUrl(config)
  let mqtt

  try {
    mqtt = require('mqtt')
  } catch (error) {
    logger.logServerError('MQTT bridge unavailable: install the mqtt package', error)
    return
  }

  client = mqtt.connect(brokerUrl, {
    clientId: config.clientId,
    username: config.username,
    password: config.password,
    keepalive: config.keepalive,
    clean: config.clean,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  })

  client.on('connect', () => {
    started = true
    logger.logServerEvent('MQTT bridge connected', {
      brokerUrl,
      topic: config.topic,
      clientId: config.clientId,
    })

    client.subscribe(config.topic, (error) => {
      if (error) {
        logger.logServerError('MQTT subscribe failed', error)
        return
      }

      logger.logServerEvent('MQTT topic subscribed', {
        topic: config.topic,
      })
    })
  })

  client.on('message', (topic, messageBuffer) => {
    handleMessage(topic, messageBuffer).catch((error) => {
      logger.logServerError('MQTT message processing failed', error)
    })
  })

  client.on('reconnect', () => {
    logger.logServerEvent('MQTT bridge reconnecting', {
      brokerUrl,
      topic: config.topic,
    })
  })

  client.on('offline', () => {
    logger.logServerEvent('MQTT bridge offline', {
      brokerUrl,
      topic: config.topic,
    })
  })

  client.on('close', () => {
    started = false
    logger.logServerEvent('MQTT bridge disconnected', {
      brokerUrl,
      topic: config.topic,
    })
  })

  client.on('error', (error) => {
    logger.logServerError('MQTT bridge error', {
      brokerUrl,
      topic: config.topic,
      message: error.message,
      name: error.name,
      code: error.code || null,
      stack: error.stack,
    })
  })
}

function stop() {
  if (!client) {
    return
  }

  client.end(true)
  client = null
  started = false
}

module.exports = {
  start,
  stop,
}
