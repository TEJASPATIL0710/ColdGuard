import {
  FULL_BACKUP_HOURS,
  IDEAL_TEMP,
  SAFE_MAX_TEMP,
  SAFE_MIN_TEMP,
} from './constants'

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function round(value, digits = 1) {
  return Number(value.toFixed(digits))
}

export function nudgeTowards(current, target, step) {
  if (current === target) {
    return current
  }

  if (current < target) {
    return Math.min(current + step, target)
  }

  return Math.max(current - step, target)
}

export function deriveTemperatureStatus(temperature) {
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

export function deriveBatteryStatus(level) {
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

export function estimateBackupHours(level) {
  return round((FULL_BACKUP_HOURS * level) / 100, 1)
}

export function calculateStability(temperature) {
  return round(Math.abs(temperature - IDEAL_TEMP), 2)
}

export function formatTime(date) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

export function getTemperatureFill(temperature) {
  const percent = ((temperature - SAFE_MIN_TEMP) / (SAFE_MAX_TEMP - SAFE_MIN_TEMP)) * 100
  return clamp(round(percent, 0), 0, 100)
}
