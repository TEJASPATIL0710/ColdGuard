import { createContext, useContext } from 'react'
import useSimulation from '../hooks/useSimulation'

const SimulationContext = createContext(null)

export function SimulationProvider({ children }) {
  const simulation = useSimulation()

  return (
    <SimulationContext.Provider value={simulation}>
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulationContext() {
  const value = useContext(SimulationContext)

  if (!value) {
    throw new Error('useSimulationContext must be used inside SimulationProvider')
  }

  return value
}
