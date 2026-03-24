import { SimulationProvider } from './context/SimulationContext'
import Dashboard from './pages/Dashboard'
import './App.css'

function App() {
  return (
    <SimulationProvider>
      <Dashboard />
    </SimulationProvider>
  )
}

export default App
