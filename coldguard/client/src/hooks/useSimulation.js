import { useEffect, useState } from 'react'
import {
  HISTORY_LIMIT,
  IDEAL_TEMP,
  MODE_LABELS,
  ROUTE_POINTS,
  SAFE_MAX_TEMP,
  TICK_MS,
} from '../utils/constants'
import {
  calculateStability,
  clamp,
  deriveBatteryStatus,
  deriveTemperatureStatus,
  estimateBackupHours,
  formatTime,
  nudgeTowards,
  round,
} from '../utils/calculations'

function createHistorySeed() {
  const now = Date.now()

  return Array.from({ length: 12 }, (_, index) => {
    const offset = (11 - index) * TICK_MS
    return {
      label: formatTime(new Date(now - offset)),
      temperature: round(4 + Math.sin(index / 2) * 0.2, 1),
      batteryLevel: round(96 - index * 0.2, 1),
    }
  })
}

function createInitialState() {
  return {
    mode: 'stable',
    isRunning: true,
    temperature: 4.1,
    batteryLevel: 96,
    solarInput: 68,
    coolingActive: false,
    ambientTemperature: 31,
    routeIndex: 0,
    history: createHistorySeed(),
    eventLog: [
      {
        time: formatTime(new Date()),
        message: 'ColdGuard digital twin started in stable transport mode.',
      },
    ],
    lastUpdated: new Date(),
  }
}

function appendEvent(eventLog, message) {
  return [
    {
      time: formatTime(new Date()),
      message,
    },
    ...eventLog,
  ].slice(0, 6)
}

function stepSimulation(current) {
  const routeIndex = (current.routeIndex + 1) % ROUTE_POINTS.length

  let nextMode = current.mode
  let temperature = current.temperature
  let batteryLevel = current.batteryLevel
  let solarInput = current.solarInput
  let coolingActive = current.coolingActive
  let ambientTemperature = current.ambientTemperature
  let eventLog = current.eventLog

  if (current.mode === 'stable') {
    const target = IDEAL_TEMP + (Math.random() - 0.5) * 0.5
    temperature = nudgeTowards(current.temperature, target, 0.3)
    batteryLevel = clamp(current.batteryLevel - 0.15, 0, 100)
    solarInput = round(64 + Math.sin(Date.now() / 5000) * 8, 0)
    coolingActive = temperature > 4.8
    ambientTemperature = round(30 + Math.random() * 2, 1)
  }

  if (current.mode === 'failure') {
    temperature = nudgeTowards(current.temperature, 10.8, 0.9)
    batteryLevel = clamp(current.batteryLevel - 0.85, 0, 100)
    solarInput = round(18 + Math.random() * 8, 0)
    coolingActive = true
    ambientTemperature = round(35 + Math.random() * 3, 1)

    if (temperature > SAFE_MAX_TEMP && current.temperature <= SAFE_MAX_TEMP) {
      eventLog = appendEvent(
        eventLog,
        'Thermal excursion detected. Cooling override engaged and alert escalated.',
      )
    }
  }

  if (current.mode === 'recovery') {
    temperature = nudgeTowards(current.temperature, 4.3, 1.2)
    batteryLevel = clamp(current.batteryLevel - 0.25, 0, 100)
    solarInput = round(58 + Math.random() * 10, 0)
    coolingActive = true
    ambientTemperature = round(29 + Math.random() * 2, 1)

    if (temperature <= 4.6) {
      nextMode = 'stable'
      eventLog = appendEvent(
        eventLog,
        'Temperature restored to vaccine-safe range. System returned to stable transit.',
      )
    }
  }

  const nextPoint = {
    label: formatTime(new Date()),
    temperature: round(temperature, 1),
    batteryLevel: round(batteryLevel, 1),
  }

  return {
    ...current,
    mode: nextMode,
    temperature: nextPoint.temperature,
    batteryLevel: nextPoint.batteryLevel,
    solarInput,
    coolingActive,
    ambientTemperature,
    routeIndex,
    history: [...current.history, nextPoint].slice(-HISTORY_LIMIT),
    eventLog,
    lastUpdated: new Date(),
  }
}

export default function useSimulation() {
  const [state, setState] = useState(createInitialState)

  useEffect(() => {
    if (!state.isRunning) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setState((current) => stepSimulation(current))
    }, TICK_MS)

    return () => window.clearInterval(timer)
  }, [state.isRunning])

  const temperatureStatus = deriveTemperatureStatus(state.temperature)
  const batteryStatus = deriveBatteryStatus(state.batteryLevel)
  const backupHours = estimateBackupHours(state.batteryLevel)
  const energyUsage =
    state.mode === 'failure'
      ? 284
      : state.mode === 'recovery'
        ? 248
        : state.coolingActive
          ? 226
          : 172
  const coolingPerformance = state.coolingActive
    ? round(
        state.mode === 'failure'
          ? 96
          : state.mode === 'recovery'
            ? 84
            : 52 + Math.max(0, state.temperature - IDEAL_TEMP) * 14,
        0,
      )
    : 14
  const coolingLabel =
    state.mode === 'failure'
      ? 'Maximum response'
      : state.mode === 'recovery'
        ? 'Recovery load'
        : state.coolingActive
          ? 'Regulated cooling'
          : 'Standby monitoring'
  const systemHealth =
    temperatureStatus.tone === 'critical'
      ? 'Critical'
      : temperatureStatus.tone === 'warning'
        ? 'Watch'
        : 'Nominal'
  const alert =
    temperatureStatus.tone === 'safe'
      ? null
      : {
          title:
            temperatureStatus.tone === 'critical'
              ? 'Immediate attention required'
              : 'Temperature trend warning',
          detail: temperatureStatus.message,
        }

  const toggleSimulation = () => {
    setState((current) => ({
      ...current,
      isRunning: !current.isRunning,
      eventLog: appendEvent(
        current.eventLog,
        current.isRunning
          ? 'Simulation paused for presentation review.'
          : 'Simulation resumed with live telemetry updates.',
      ),
    }))
  }

  const triggerFailure = () => {
    setState((current) => ({
      ...current,
      mode: 'failure',
      coolingActive: true,
      eventLog: appendEvent(
        current.eventLog,
        'Failure scenario injected: seal leak and solar drop simulated.',
      ),
    }))
  }

  const restoreSystem = () => {
    setState((current) => ({
      ...current,
      mode: 'recovery',
      coolingActive: true,
      eventLog: appendEvent(
        current.eventLog,
        'Recovery command issued. Peltier boost and PCM support rebalancing cargo bay.',
      ),
    }))
  }

  return {
    ...state,
    modeLabel: MODE_LABELS[state.mode],
    location: ROUTE_POINTS[state.routeIndex],
    temperatureStatus,
    batteryStatus,
    backupHours,
    energyUsage,
    coolingPerformance,
    coolingLabel,
    systemHealth,
    alert,
    toggleSimulation,
    triggerFailure,
    restoreSystem,
  }
}
