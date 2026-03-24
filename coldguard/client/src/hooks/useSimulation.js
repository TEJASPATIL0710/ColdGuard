import { useEffect, useState } from 'react'
import { IDEAL_TEMP, TICK_MS } from '../utils/constants'
import {
  deriveBatteryStatus,
  deriveTemperatureStatus,
  estimateBackupHours,
  formatTime,
  round,
} from '../utils/calculations'
import {
  getSimulation,
  getSimulationHistory,
  getSensorReadings,
  restoreSimulationSystem,
  setSimulationRunning,
  triggerFailureScenario,
} from '../services/api'

function createInitialState() {
  return {
    mode: 'stable',
    modeLabel: 'Connecting',
    isRunning: true,
    temperature: null,
    batteryLevel: null,
    batteryIsCharging: false,
    batteryStatusCode: null,
    batteryEstimatedHours: null,
    solarInput: null,
    solarPower: null,
    solarIsGenerating: false,
    solarStatus: null,
    coolingActive: false,
    ambientTemperature: null,
    location: 'Waiting for backend',
    history: [],
    recentSensorReadings: [],
    activeSensors: [],
    activeSensorCount: 0,
    lastSensorReading: null,
    sensorFeedActive: false,
    sensorFeedSource: null,
    eventLog: [],
    lastUpdated: new Date(),
    error: null,
    temperatureStatus: null,
    batteryStatus: null,
    backupHours: null,
    energyUsage: null,
    coolingPerformance: null,
    coolingLabel: null,
    systemHealth: 'Connecting',
    alert: null,
  }
}

function normalizeHistory(history = []) {
  return history.map((point) => ({
    label: formatTime(new Date(point.recordedAt)),
    recordedAt: point.recordedAt,
    temperature: Number(point.temperature),
    batteryLevel: Number(point.batteryLevel),
  }))
}

function normalizeSensorReading(reading) {
  if (!reading) {
    return null
  }

  const batteryLevel = Number(reading.batteryLevel)
  const batteryEstimatedHours = Number(reading.batteryEstimatedHours)
  const solarInput = Number(reading.solarInput)
  const solarPower = Number(reading.solarPower)

  return {
    ...reading,
    recordedAt: reading.recordedAt,
    temperature: reading.temperature === null ? null : Number(reading.temperature),
    ambientTemperature:
      reading.ambientTemperature === null ? null : Number(reading.ambientTemperature),
    batteryLevel: Number.isFinite(batteryLevel) ? batteryLevel : null,
    batteryIsCharging:
      typeof reading.batteryIsCharging === 'boolean'
        ? reading.batteryIsCharging
        : Boolean(Number(reading.batteryIsCharging)),
    batteryStatus: reading.batteryStatus || null,
    batteryEstimatedHours: Number.isFinite(batteryEstimatedHours) ? batteryEstimatedHours : null,
    solarInput: Number.isFinite(solarInput) ? solarInput : null,
    solarPower: Number.isFinite(solarPower) ? solarPower : null,
    solarIsGenerating:
      typeof reading.solarIsGenerating === 'boolean'
        ? reading.solarIsGenerating
        : Boolean(Number(reading.solarIsGenerating)),
    solarStatus: reading.solarStatus || null,
  }
}

function normalizeSensorReadings(readings = []) {
  return readings.map((reading) => normalizeSensorReading(reading)).filter(Boolean)
}

function normalizeSimulation(rawState, historyResponse, sensorFeedResponse) {
  const normalizedHistory = normalizeHistory(historyResponse.history)
  const normalizedRecentSensorReadings = normalizeSensorReadings(sensorFeedResponse.readings)
  const normalizedActiveSensors = normalizeSensorReadings(sensorFeedResponse.sensors)
  const lastSensorReading =
    normalizeSensorReading(rawState.lastSensorReading) || normalizedRecentSensorReadings[0]
  const latestHistoryPoint = normalizedHistory.at(-1)
  const sensorBatteryLevel = Number(lastSensorReading?.batteryLevel)
  const temperature = rawState.temperature === null ? null : Number(rawState.temperature)
  const batteryLevel = Number.isFinite(sensorBatteryLevel)
    ? sensorBatteryLevel
    : latestHistoryPoint
      ? Number(latestHistoryPoint.batteryLevel)
      : rawState.batteryLevel === null
        ? null
        : Number(rawState.batteryLevel)
  const solarInput = rawState.solarInput === null ? null : Number(rawState.solarInput)
  const solarPower =
    rawState.solarPower === null || rawState.solarPower === undefined
      ? lastSensorReading?.solarPower ?? null
      : Number(rawState.solarPower)
  const ambientTemperature =
    rawState.ambientTemperature === null ? null : Number(rawState.ambientTemperature)
  const batteryEstimatedHours = Number(
    rawState.batteryEstimatedHours ?? lastSensorReading?.batteryEstimatedHours,
  )
  const batteryStatusCode =
    rawState.batteryStatusCode || lastSensorReading?.batteryStatus || null
  const batteryIsCharging =
    typeof rawState.batteryIsCharging === 'boolean'
      ? rawState.batteryIsCharging
      : Boolean(lastSensorReading?.batteryIsCharging)
  const solarIsGenerating =
    typeof rawState.solarIsGenerating === 'boolean'
      ? rawState.solarIsGenerating
      : Boolean(lastSensorReading?.solarIsGenerating)
  const solarStatus = rawState.solarStatus || lastSensorReading?.solarStatus || null
  const temperatureStatus =
    rawState.temperatureStatus || (temperature === null ? null : deriveTemperatureStatus(temperature))
  const derivedBatteryStatus =
    rawState.batteryStatus || (batteryLevel === null ? null : deriveBatteryStatus(batteryLevel))
  const batteryStatus = batteryStatusCode
    ? {
        tone:
          batteryStatusCode === 'CRITICAL' || batteryStatusCode === 'LOW'
            ? 'critical'
            : batteryStatusCode === 'MEDIUM' || batteryStatusCode === 'DISCHARGING'
              ? 'warning'
              : 'safe',
        label: batteryStatusCode.replace(/_/g, ' '),
      }
    : derivedBatteryStatus
  const backupHours =
    Number.isFinite(batteryEstimatedHours)
      ? batteryEstimatedHours
      : rawState.backupHours !== undefined
        ? Number(rawState.backupHours)
        : batteryLevel === null
          ? null
          : estimateBackupHours(batteryLevel)
  const energyUsage = Number.isFinite(solarPower) ? solarPower : 0
  const coolingPerformance = temperature === null
    ? null
    : rawState.coolingActive
    ? round(
        rawState.mode === 'failure'
          ? 96
          : rawState.mode === 'recovery'
            ? 84
            : 52 + Math.max(0, temperature - IDEAL_TEMP) * 14,
        0,
      )
    : 14
  const coolingLabel = temperature === null
    ? null
    : rawState.mode === 'failure'
      ? 'Maximum response'
      : rawState.mode === 'recovery'
        ? 'Recovery load'
        : rawState.coolingActive
          ? 'Regulated cooling'
          : 'Standby monitoring'
  const systemHealth =
    temperatureStatus.tone === 'critical'
      ? 'Critical'
      : temperatureStatus.tone === 'warning'
        ? 'Watch'
        : 'Nominal'

  return {
    mode: rawState.mode,
    modeLabel: rawState.modeLabel || 'Unknown',
    isRunning: Boolean(rawState.isRunning),
    temperature,
    batteryLevel,
    batteryIsCharging,
    batteryStatusCode,
    batteryEstimatedHours: Number.isFinite(batteryEstimatedHours) ? batteryEstimatedHours : null,
    solarInput,
    solarPower,
    solarIsGenerating,
    solarStatus,
    coolingActive: Boolean(rawState.coolingActive),
    ambientTemperature,
    location: rawState.location || 'Unknown route',
    history: normalizedHistory,
    recentSensorReadings: normalizedRecentSensorReadings,
    activeSensors: normalizedActiveSensors,
    activeSensorCount:
      Number(sensorFeedResponse.activeSources) ||
      normalizedActiveSensors.length ||
      (lastSensorReading?.source ? 1 : 0),
    lastSensorReading,
    sensorFeedActive: Boolean(rawState.sensorFeedActive),
    sensorFeedSource:
      rawState.sensorFeedSource || rawState.lastSensorReading?.source || lastSensorReading?.source || null,
    eventLog: rawState.eventLog || [],
    lastUpdated: new Date(rawState.lastUpdated || Date.now()),
    temperatureStatus,
    batteryStatus,
    backupHours,
    energyUsage: energyUsage === 0 && solarPower === null ? null : energyUsage,
    coolingPerformance,
    coolingLabel,
    systemHealth,
    alert: rawState.alert || null,
  }
}

async function loadSimulationSnapshot() {
  const simulation = await getSimulation()
  const activeSource =
    simulation.sensorFeedSource || simulation.lastSensorReading?.source || undefined
  const [history, sensorFeed] = await Promise.all([
    getSimulationHistory(10, simulation.sensorFeedActive ? activeSource : undefined),
    getSensorReadings(12),
  ])

  return normalizeSimulation(simulation, history, sensorFeed)
}

export default function useSimulation() {
  const [state, setState] = useState(createInitialState)

  useEffect(() => {
    let isActive = true

    const syncFromBackend = async () => {
      try {
        const nextState = await loadSimulationSnapshot()

        if (isActive) {
          setState((current) => ({
            ...current,
            ...nextState,
            error: null,
          }))
        }
      } catch (error) {
        if (isActive) {
          setState((current) => ({
            ...current,
            error: error.message,
          }))
        }
      }
    }

    syncFromBackend()

    const timer = window.setInterval(() => {
      syncFromBackend()
    }, TICK_MS)

    return () => {
      isActive = false
      window.clearInterval(timer)
    }
  }, [])

  const runAction = async (action) => {
    try {
      await action()
      const nextState = await loadSimulationSnapshot()

      setState((current) => ({
        ...current,
        ...nextState,
        error: null,
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message,
      }))
    }
  }

  const toggleSimulation = () => {
    runAction(() => setSimulationRunning(!state.isRunning))
  }

  const triggerFailure = () => {
    runAction(() => triggerFailureScenario())
  }

  const restoreSystem = () => {
    runAction(() => restoreSimulationSystem())
  }

  return {
    ...state,
    toggleSimulation,
    triggerFailure,
    restoreSystem,
  }
}
