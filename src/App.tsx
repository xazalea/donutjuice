import { useState, useEffect } from 'react'
import { WebContainer } from '@webcontainer/api'
import { AIConversationScanner } from './components/AIConversationScanner'
import { PerformanceOptimizer } from '@lib/performance'
import { 
  LayoutDashboard, 
  ScanLine, 
  ShieldAlert, 
  Settings, 
  Search, 
  Bell, 
  User,
  LogOut,
  Menu
} from 'lucide-react'
import './App.css'

function App() {
  const [_webcontainer, setWebcontainer] = useState<WebContainer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [optimizer, setOptimizer] = useState<PerformanceOptimizer | null>(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    const init = async () => {
      try {
        const container = await WebContainer.boot()
        setWebcontainer(container)
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
      if (optimizer) optimizer.cleanup()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>DonutJuice</h1>
          <p>Initializing Research Framework...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🍩</span>
          <span className="brand-text">DonutJuice</span>
        </div>
        
        <nav className="nav-menu">
          <div className="nav-group">
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'scans' ? 'active' : ''}`}
              onClick={() => setActiveTab('scans')}
            >
              <ScanLine size={20} />
              <span>Scans</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'findings' ? 'active' : ''}`}
              onClick={() => setActiveTab('findings')}
            >
              <ShieldAlert size={20} />
              <span>Findings</span>
            </button>
          </div>

          <div className="nav-group bottom">
            <button className="nav-item">
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </div>
        </nav>

        <div className="user-profile">
          <div className="avatar">
            <User size={20} />
          </div>
          <div className="user-info">
            <span className="name">Researcher</span>
            <span className="role">Admin</span>
          </div>
          <button className="logout-btn">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Search exploits, logs, or vectors..." />
          </div>
          <div className="header-actions">
            <button className="icon-btn">
              <Bell size={20} />
              <span className="notification-dot"></span>
            </button>
            <div className="model-status">
              <span className="status-dot online"></span>
              <span>donut-2.5 active</span>
            </div>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'dashboard' && (
            <AIConversationScanner />
          )}
          {/* Other tabs can be implemented later */}
        </div>
      </main>
    </div>
  )
}

export default App
