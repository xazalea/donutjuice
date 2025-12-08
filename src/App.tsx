import { useState, useEffect } from 'react'
import { WebContainer } from '@webcontainer/api'
import { AIConversationScanner } from './components/AIConversationScanner'
import { AIPanel } from './components/AIPanel'
import { PerformanceMonitor } from './components/PerformanceMonitor'
import { PerformanceOptimizer } from '@lib/performance'
import './App.css'

function App() {
  const [_webcontainer, setWebcontainer] = useState<WebContainer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [optimizer, setOptimizer] = useState<PerformanceOptimizer | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize WebContainer
        const container = await WebContainer.boot()
        setWebcontainer(container)

        // Initialize performance optimizer
        const perfOptimizer = new PerformanceOptimizer()
        perfOptimizer.initialize()
        setOptimizer(perfOptimizer)

        setIsLoading(false)
      } catch (error) {
        console.error('Failed to initialize:', error)
        setIsLoading(false)
      }
    }

    init()

    return () => {
      if (optimizer) {
        optimizer.cleanup()
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">
          <h1>DonutJuice</h1>
          <p>Initializing ChromeOS Security Research Framework...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍩 DonutJuice</h1>
        <p>ChromeOS Security Research Framework</p>
        <p className="model-badge">Powered by donut-2.5</p>
      </header>

      <main className="app-main">
        <div className="grid-container">
          <div className="panel main-scanner-panel">
            <h2>🔥 Aggressive Exploit Scanner (donut-2.5)</h2>
            <AIConversationScanner />
          </div>

          <div className="panel">
            <h2>Advanced AI Analysis</h2>
            <AIPanel />
          </div>

          <div className="panel">
            <h2>Performance Monitor</h2>
            <PerformanceMonitor optimizer={optimizer} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App

