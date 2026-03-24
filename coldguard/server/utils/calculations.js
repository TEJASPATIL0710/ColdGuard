const FULL_BACKUP_HOURS = 72
const SAFE_MIN_TEMP = 2
const SAFE_MAX_TEMP = 8
const IDEAL_TEMP = 4.2

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits))
}

function nudgeTowards(current, target, step) {
  if (current < target) {
    return Math.min(current + step, target)
  }

  if (current > target) {
    return Math.max(current - step, target)
  }

  return current
}

function estimateBackupHours(batteryLevel) {
  return round((FULL_BACKUP_HOURS * batteryLevel) / 100, 1)
}

function calculateStability(temperature) {
  return round(Math.abs(temperature - IDEAL_TEMP), 2)
}

function deriveTemperatureStatus(temperature) {
  if (temperature < SAFE_MIN_TEMP || temperature > SAFE_MAX_TEMP + 1) {
    return {
      tone: 'critical',
      label: 'Critical',
      message: 'Cargo safety is at risk. Immediate correction required.',
    }
  }

  if (temperature < SAFE_MIN_TEMP + 0.4 || temperature > SAFE_MAX_TEMP) {
    return {
      tone: 'warning',
      label: 'Warning',
      message: 'Temperature is drifting outside the ideal transport band.',
    }
  }

  return {
    tone: 'safe',
    label: 'Safe',
    message: 'Temperature remains inside the vaccine-safe transport window.',
  }
}

function deriveBatteryStatus(level) {
  if (level <= 20) {
    return {
      tone: 'critical',
      label: 'Low reserve',
    }
  }

  if (level <= 45) {
    return {
      tone: 'warning',
      label: 'Monitor closely',
    }
  }

  return {
    tone: 'safe',
    label: 'Healthy reserve',
  }
}

function formatClock(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '--:--:--'
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  })
}

module.exports = {
  FULL_BACKUP_HOURS,
  SAFE_MIN_TEMP,
  SAFE_MAX_TEMP,
  IDEAL_TEMP,
  clamp,
  round,
  nudgeTowards,
  estimateBackupHours,
  calculateStability,
  deriveTemperatureStatus,
  deriveBatteryStatus,
  formatClock,
}
