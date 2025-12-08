import { useState, useEffect, useRef } from 'react'
import { RAGFlowIntegration, ScanPlan } from '@lib/integrations/ragflow'
import { AggressiveChromeOSScanner } from '@lib/chromeos/aggressive-scanner'
import { AIInferenceEngine } from '@lib/ai'
import './AIConversationScanner.css'

export function AIConversationScanner() {
  const [ragflow] = useState(() => new RAGFlowIntegration())
  const [message, setMessage] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<any[]>([])
  const [scanPlan, setScanPlan] = useState<ScanPlan | null>(null)
  const [autoAnalysis, setAutoAnalysis] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-analyze on page load
  useEffect(() => {
    const performAutoAnalysis = async () => {
      try {
        const deviceData = collectDeviceData()
        const aiEngine = new AIInferenceEngine()
        const analysis = await aiEngine.analyzeDeviceData(JSON.stringify(deviceData, null, 2))
        setAutoAnalysis(analysis)
        
        // Add initial AI message
        ragflow.addMessage('assistant', `Initial analysis complete. I've detected ${analysis.vulnerabilities.length} potential vulnerabilities. Let's create an aggressive, comprehensive scan plan to find ALL exploits. What would you like to scan?`)
      } catch (error) {
        console.error('Auto-analysis error:', error)
      }
    }

    performAutoAnalysis()
  }, [])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ragflow.getConversation().messages])

  // Check for scan plan updates
  useEffect(() => {
    const plan = ragflow.getScanPlan()
    if (plan) {
      setScanPlan(plan)
    }
  }, [ragflow.getConversation().messages])

  const handleSendMessage = async () => {
    if (!message.trim()) return

    const userMessage = message
    setMessage('')

    // Get AI response
    await ragflow.chat(userMessage)

    // Check if scan plan was created
    const plan = ragflow.getScanPlan()
    if (plan) {
      setScanPlan(plan)
    }
  }

  const handleStartScan = async () => {
    if (!scanPlan) return

    setScanning(true)
    setScanResults([])

    try {
      const scanner = new AggressiveChromeOSScanner(
        scanPlan.invasiveness,
        scanPlan.aggressiveness
      )

      const results = await scanner.scanComprehensive(scanPlan.target)
      setScanResults(results)

      // Add scan completion message
      ragflow.addMessage('assistant', `Scan complete! Found ${results.length} exploits with ${results.filter(r => r.severity === 'critical').length} critical vulnerabilities.`)
    } catch (error) {
      console.error('Scan error:', error)
      ragflow.addMessage('assistant', `Scan encountered an error: ${(error as Error).message}`)
    } finally {
      setScanning(false)
    }
  }

  const conversation = ragflow.getConversation()

  return (
    <div className="ai-conversation-scanner">
      {autoAnalysis && (
        <div className="auto-analysis-banner">
          <h3>🚀 Auto-Analysis Complete (donut-2.5)</h3>
          <p>Found {autoAnalysis.vulnerabilities.length} potential vulnerabilities</p>
          <details>
            <summary>View Analysis</summary>
            <div className="analysis-details">
              {autoAnalysis.vulnerabilities.length > 0 && (
                <div>
                  <strong>Vulnerabilities:</strong>
                  <ul>
                    {autoAnalysis.vulnerabilities.map((v: string, i: number) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      <div className="conversation-container">
        <div className="messages">
          {conversation.messages
            .filter(m => m.role !== 'system')
            .map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-role">{msg.role === 'user' ? 'You' : 'donut-2.5'}</div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
          <div ref={messagesEndRef} />
        </div>

        {scanPlan && (
          <div className="scan-plan">
            <h3>📋 Custom Scan Plan Ready</h3>
            <div className="plan-details">
              <p><strong>Target:</strong> {scanPlan.target}</p>
              <p><strong>Aggressiveness:</strong> {scanPlan.aggressiveness.toUpperCase()}</p>
              <p><strong>Invasiveness:</strong> {scanPlan.invasiveness.toUpperCase()}</p>
              <p><strong>Scan Types:</strong> {scanPlan.scanTypes.join(', ')}</p>
              <p><strong>Techniques:</strong> {scanPlan.techniques.join(', ')}</p>
              <p><strong>Estimated Duration:</strong> {scanPlan.estimatedDuration}s</p>
            </div>
            <button
              className="start-scan-button"
              onClick={handleStartScan}
              disabled={scanning}
            >
              {scanning ? '🔍 Scanning Aggressively...' : '🚀 START AGGRESSIVE SCAN'}
            </button>
          </div>
        )}

        <div className="input-container">
          <input
            type="text"
            placeholder="Tell donut-2.5 what you want to scan..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={scanning}
          />
          <button onClick={handleSendMessage} disabled={scanning || !message.trim()}>
            Send
          </button>
        </div>
      </div>

      {scanResults.length > 0 && (
        <div className="scan-results">
          <h3>🔥 Aggressive Scan Results ({scanResults.length} exploits found)</h3>
          <div className="results-grid">
            {scanResults.map((result, index) => (
              <div key={index} className={`result-card severity-${result.severity}`}>
                <div className="result-header">
                  <span className="result-exploit">{result.exploit}</span>
                  <span className={`severity-badge severity-${result.severity}`}>
                    {result.severity}
                  </span>
                </div>
                <div className="result-type">Type: {result.type}</div>
                <div className="result-vector">Vector: {result.vector}</div>
                <div className="result-confidence">Confidence: {(result.confidence * 100).toFixed(0)}%</div>
                {result.evidence.length > 0 && (
                  <div className="result-evidence">
                    <strong>Evidence:</strong>
                    <ul>
                      {result.evidence.map((e: string, i: number) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function collectDeviceData() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
    },
    localStorage: Object.keys(localStorage).reduce((acc, key) => {
      acc[key] = localStorage.getItem(key)
      return acc
    }, {} as Record<string, string | null>),
    cookies: document.cookie,
    timestamp: new Date().toISOString(),
  }
}

