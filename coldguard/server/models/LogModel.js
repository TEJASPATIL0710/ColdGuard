const { formatClock } = require('../utils/calculations')

function createLogEntry(message, level = 'info') {
  const createdAt = new Date()

  return {
    id: `${createdAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    message,
    createdAt: createdAt.toISOString(),
    timeLabel: formatClock(createdAt),
  }
}

module.exports = {
  createLogEntry,
}
