import { useState, useEffect, useRef } from 'react'
import { RAGFlowIntegration, ScanPlan } from '@lib/integrations/ragflow'
import { AggressiveChromeOSScanner } from '@lib/chromeos/aggressive-scanner'
import { ModelManager } from '@lib/ai/model-manager'
import { DeepInfraModel } from '@lib/integrations/deepinfra'
import { 
  Send, 
  Dna, 
  Flame, 
  Rocket, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Terminal, 
  Cpu, 
  Zap,
  Filter,
  Search,
  ChevronRight,
  Play
} from 'lucide-react'
import './AIConversationScanner.css'
import './SystemDump.css'

export function AIConversationScanner() {
  const [modelManager] = useState(() => new ModelManager())
  const [ragflow] = useState(() => new RAGFlowIntegration())
  const [message, setMessage] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<any[]>([])
  const [evolutionCycle, setEvolutionCycle] = useState(0)
  const [evolutionMessage, setEvolutionMessage] = useState('')
  const [scanPlan, setScanPlan] = useState<ScanPlan | null>(null)
  const [currentModel, setCurrentModel] = useState<DeepInfraModel>(modelManager.getCurrentModel())
  const [systemDump, setSystemDump] = useState('')
  const [conversationMessages, setConversationMessages] = useState<Array<{role: string, content: string, model?: string}>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ... (keep useEffects for auto-analysis, etc. similar to before but simplified for this view)

  const handleSendMessage = async () => {
    if (!message.trim()) return
    const userMessage = message
    setMessage('')
    setConversationMessages(prev => [...prev, { role: 'user', content: userMessage }])
    ragflow.addMessage('user', userMessage)

    try {
      const systemPrompt = 'You are an expert security researcher specializing in ChromeOS exploit discovery. Help users identify and plan comprehensive security scans. Be thorough, aggressive, and leave no stone unturned. When the user and you agree on a scan plan, create a scan button.'
      const result = await modelManager.chat(userMessage, systemPrompt)
      if (result.switched) setCurrentModel(modelManager.getCurrentModel())
      setConversationMessages(prev => [...prev, { role: 'assistant', content: result.content, model: result.model }])
      ragflow.addMessage('assistant', result.content)
      const plan = ragflow.getScanPlan()
      if (plan) setScanPlan(plan)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = `Error: ${(error as Error).message}`
      setConversationMessages(prev => [...prev, { role: 'assistant', content: errorMessage }])
    }
  }

  const handleStartScan = async () => {
    if (!scanPlan) return
    setScanning(true)
    setScanResults([])
    try {
      const scanner = new AggressiveChromeOSScanner(
        scanPlan.invasiveness,
        scanPlan.aggressiveness,
        undefined,
        modelManager.getOpenMemory(),
        modelManager.getOpenReason()
      )
      const results = await scanner.scanComprehensive(scanPlan.target, systemDump, (cycle, message) => {
        setEvolutionCycle(cycle)
        setEvolutionMessage(message)
      })
      setScanResults(results)
      ragflow.addMessage('assistant', `Scan complete! Found ${results.length} exploits.`)
    } catch (error) {
      console.error('Scan error:', error)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="scanner-layout">
      {/* Inner Sidebar / Filters */}
      <div className="scanner-filters">
        <div className="filter-section">
          <h3><Filter size={16} /> Categories</h3>
          <div className="filter-list">
            <button className="filter-item active">
              <span>All Exploits</span>
              <span className="count">{scanResults.length}</span>
            </button>
            <button className="filter-item">
              <span>Critical</span>
              <span className="count">{scanResults.filter(r => r.severity === 'critical').length}</span>
            </button>
            <button className="filter-item">
              <span>High</span>
              <span className="count">{scanResults.filter(r => r.severity === 'high').length}</span>
            </button>
          </div>
        </div>

        <div className="filter-section">
          <h3>System Context</h3>
          <div className="system-dump-mini">
            <textarea 
              placeholder="Paste system dump..."
              value={systemDump}
              onChange={(e) => setSystemDump(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="scanner-main">
        {/* Chat / Control Header */}
        <div className="scanner-chat-area">
          <div className="chat-messages">
             {conversationMessages.length === 0 && (
               <div className="empty-state">
                 <Terminal size={48} className="empty-icon" />
                 <h3>Ready to Analyze</h3>
                 <p>Tell donut-2.5 what to scan or paste a system dump.</p>
               </div>
             )}
             {conversationMessages.map((msg, i) => (
               <div key={i} className={`chat-msg ${msg.role}`}>
                 <div className="msg-content">{msg.content}</div>
               </div>
             ))}
             <div ref={messagesEndRef} />
          </div>
          
          <div className="chat-input-wrapper">
             <input 
               type="text" 
               value={message}
               onChange={(e) => setMessage(e.target.value)}
               onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
               placeholder="Describe target or exploit vector..."
             />
             <button className="send-btn" onClick={handleSendMessage}>
               <Send size={18} />
             </button>
          </div>

          {scanPlan && !scanning && !scanResults.length && (
            <div className="scan-plan-card">
              <div className="plan-info">
                <h4><Rocket size={16} /> Scan Plan Ready</h4>
                <span>Target: {scanPlan.target}</span>
              </div>
              <button className="start-btn" onClick={handleStartScan}>
                Start Scan <Play size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Scanning Status */}
        {scanning && (
          <div className="scanning-status-card">
             <div className="status-header">
               <div className="spinner"></div>
               <h4>Evolution Cycle {evolutionCycle}</h4>
             </div>
             <p>{evolutionMessage}</p>
             <div className="progress-bar">
               <div className="fill" style={{width: `${Math.min(evolutionCycle * 20, 100)}%`}}></div>
             </div>
             <div className="status-tags">
               <span className="tag"><Dna size={14} /> Evolving</span>
               <span className="tag"><Flame size={14} /> Aggressive</span>
             </div>
          </div>
        )}

        {/* Results Grid */}
        <div className="results-grid">
          {scanResults.map((result, index) => (
            <div key={index} className="exploit-card">
              <div className="card-image-placeholder">
                <div className={`severity-indicator ${result.severity}`}></div>
                <Terminal size={32} />
              </div>
              <div className="card-content">
                <div className="card-header">
                  <h4>{result.exploit}</h4>
                  <span className="price-tag">{(result.confidence * 100).toFixed(0)}% Conf</span>
                </div>
                <p className="exploit-type">{result.type}</p>
                
                <div className="card-tags">
                   {result.type === 'ai-evolved' && <span className="tag evolved"><Dna size={12}/> Evolved</span>}
                   {result.severity === 'critical' && <span className="tag critical"><AlertTriangle size={12}/> Critical</span>}
                </div>

                {result.activeExploitResult && (
                    <div className={`active-status ${result.activeExploitResult.success ? 'success' : 'fail'}`}>
                        {result.activeExploitResult.success ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                        <span>Active Exploit</span>
                    </div>
                )}
                
                <button className="details-btn">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
