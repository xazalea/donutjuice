import { Outlet, useLocation } from 'react-router-dom'
import { Settings, Bell, Search, Shield, Zap, Terminal } from 'lucide-react'
import { useState, useEffect } from 'react'
import { WebContainer } from '@webcontainer/api'
import { PerformanceOptimizer } from '@lib/performance'

export function Layout() {
  const location = useLocation()
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null)

  useEffect(() => {
    // Boot WebContainer once at the root level
    const boot = async () => {
      try {
        const wc = await WebContainer.boot()
        setWebcontainer(wc)
        // Mount it to window for global access (simplest for this flow)
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
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🍩</span>
          <span className="brand-text">DonutJuice</span>
        </div>
        
        <nav className="nav-menu">
          <div className="nav-group">
            <div className={`nav-item ${location.pathname === '/start' ? 'active' : ''}`}>
              <Shield size={20} />
              <span>1. Objective</span>
            </div>
            <div className={`nav-item ${location.pathname === '/search' ? 'active' : ''}`}>
              <Zap size={20} />
              <span>2. Active Search</span>
            </div>
            <div className={`nav-item ${location.pathname === '/exploit' ? 'active' : ''}`}>
              <Terminal size={20} />
              <span>3. Exploitation</span>
            </div>
          </div>
        </nav>

        <div className="user-profile">
          <div className="model-status">
            <span className="status-dot online"></span>
            <span>donut-2.5 active</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="breadcrumbs">
            {location.pathname.replace('/', '').toUpperCase()} PHASE
          </div>
          <div className="header-actions">
            <Bell size={20} />
          </div>
        </header>
        <div className="content-area">
          <Outlet context={{ webcontainer }} />
        </div>
      </main>
    </div>
  )
}

