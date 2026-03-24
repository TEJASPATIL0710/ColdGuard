const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  if (!response.ok) {
    let message = 'Request failed.'

    try {
      const errorBody = await response.json()
      message = errorBody.message || message
    } catch {
      // Ignore JSON parsing errors and keep the fallback message.
    }

    throw new Error(message)
  }

  return response.json()
}

export function getSimulation() {
  return request('/api/simulation')
}

export function getSimulationHistory(limit = 12, source) {
  const params = new URLSearchParams({
    limit: String(limit),
  })

  if (source) {
    params.set('source', source)
  }

  return request(`/api/simulation/history?${params.toString()}`)
}

export function getSensorReadings(limit = 10) {
  return request(`/api/simulation/sensor-readings?limit=${limit}`)
}

export function setSimulationRunning(isRunning) {
  return request('/api/simulation/running', {
    method: 'POST',
    body: JSON.stringify({ isRunning }),
  })
}

export function triggerFailureScenario() {
  return request('/api/simulation/failure', {
    method: 'POST',
  })
}

export function restoreSimulationSystem() {
  return request('/api/simulation/recovery', {
    method: 'POST',
  })
}
