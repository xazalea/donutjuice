import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { WebContainer } from '@webcontainer/api'
import { PerformanceOptimizer } from '@lib/performance'

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null)

  useEffect(() => {
    const boot = async () => {
      try {
        const wc = await WebContainer.boot()
        setWebcontainer(wc)
        ;(window as any).webcontainerInstance = wc
        const optimizer = new PerformanceOptimizer()
        optimizer.initialize()
      } catch (e) {
        console.error('WebContainer boot failed:', e)
      }
    }
    boot()
  }, [])

  return (
    <div className="app-container">
      <header className="top-nav">
        <div className="nav-brand">
          <span>🍩 DonutJuice</span>
        </div>
        <nav className="nav-links">
          <div 
            className={`nav-link ${location.pathname === '/start' ? 'active' : ''}`}
            onClick={() => navigate('/start')}
          >
            Chat
          </div>
          <div 
            className={`nav-link ${location.pathname === '/search' ? 'active' : ''}`}
            onClick={() => navigate('/search')}
          >
            Analysis
          </div>
          <div 
            className={`nav-link ${location.pathname === '/exploit' ? 'active' : ''}`}
            onClick={() => navigate('/exploit')}
          >
            Exploit
          </div>
          <div 
            className={`nav-link ${location.pathname === '/kajig' ? 'active' : ''}`}
            onClick={() => navigate('/kajig')}
          >
            Kajig
          </div>
        </nav>
        <div className="nav-actions">
          {/* Status or User Profile could go here */}
        </div>
      </header>

      <main className="main-content">
        <div className="content-wrapper">
          <Outlet context={{ webcontainer }} />
        </div>
      </main>
    </div>
  )
}
