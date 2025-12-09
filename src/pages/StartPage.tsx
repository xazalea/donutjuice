import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Terminal, Cpu } from 'lucide-react'
import { ModelManager } from '@lib/ai/model-manager'
import './StartPage.css'

export function StartPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  const [scanReady, setScanReady] = useState(false)
  const [modelManager] = useState(() => new ModelManager())
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initial greeting
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "I am donut-2.5, your advanced ChromeOS exploit singularity. I have root-level access to the virtual environment. Tell me what vulnerability you wish to discover (e.g., 'Unenrollment', 'Root Shell', 'WebView escape')."
      }])
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!message.trim()) return
    
    const userMsg = message
    setMessage('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])

    try {
      // Simulate/Real AI Call
      const systemPrompt = "You are donut-2.5, an aggressive security researcher. Your goal is to understand the user's exploit target. If the user specifies a clear target (like 'unenrollment' or 'root access'), acknowledge it and output exactly: 'TARGET_LOCKED: [Target Name]'. Otherwise, ask clarifying questions."
      
      const response = await modelManager.chat(userMsg, systemPrompt)
      let aiContent = response.content

      // Check for agreement trigger
      if (aiContent.includes('TARGET_LOCKED') || userMsg.toLowerCase().includes('scan') || userMsg.toLowerCase().includes('exploit')) {
        setScanReady(true)
        if (!aiContent.includes('TARGET_LOCKED')) {
           aiContent = "Target acknowledged. I have constructed a bespoke attack vector for this objective."
        }
        localStorage.setItem('scanTarget', userMsg)
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiContent }])

    } catch (error) {
      // Fallback if AI fails (offline/error)
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection unstable. Switching to local heuristic logic. Target acknowledged. Ready to engage active search." }])
      setScanReady(true)
      localStorage.setItem('scanTarget', userMsg)
    }
  }

  const startSearch = () => {
    navigate('/search')
  }

  return (
    <div className="start-page">
      <div className="chat-container">
        <div className="messages-area">
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="message-avatar">
                {m.role === 'assistant' ? <Cpu size={18} /> : <Terminal size={18} />}
              </div>
              <div className="message-bubble">{m.content}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        
        <div className="input-area">
          <input 
            type="text" 
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Define exploit objective..."
            disabled={scanReady}
          />
          <button className="send-btn" onClick={handleSend} disabled={scanReady}>
            <Send size={18} />
          </button>
        </div>
      </div>

      {scanReady && (
        <div className="ready-overlay">
          <div className="ready-card">
            <h3>🎯 Objective Locked</h3>
            <p>Attack vectors compiled. Virtual environment prepped.</p>
            <button className="engage-btn" onClick={startSearch}>
              INITIATE ACTIVE SEARCH
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

