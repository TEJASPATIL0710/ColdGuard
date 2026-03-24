const fs = require('fs')
const path = require('path')

const LOG_DIR = __dirname

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function timestamp() {
  return new Date().toISOString()
}

function stringify(value) {
  if (value instanceof Error) {
    return JSON.stringify(
      {
        name: value.name,
        message: value.message,
        stack: value.stack,
      },
      null,
      2,
    )
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function appendBlock(fileName, title, payload) {
  ensureLogDir()

  const filePath = path.join(LOG_DIR, fileName)
  const content = [
    `[${timestamp()}] ${title}`,
    stringify(payload),
    '',
  ].join('\n')

  fs.appendFileSync(filePath, content, 'utf8')
}

function logIncomingSensor(payload) {
  appendBlock('incoming-signals.txt', 'INCOMING SENSOR READING', payload)
}

function logOutgoingEsp32(payload) {
  appendBlock('outgoing-signals.txt', 'OUTGOING ESP32 SIGNALS', payload)
}

function logServerEvent(message, meta) {
  appendBlock('server-events.txt', message, meta || {})
}

function logServerError(message, error) {
  appendBlock('errors.txt', message, error)
}

module.exports = {
  logIncomingSensor,
  logOutgoingEsp32,
  logServerEvent,
  logServerError,
}
