import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Terminal, Loader2 } from 'lucide-react'
import { ModelManager } from '@lib/ai/model-manager'
import { ModelLoadingIndicator } from '../components/ModelLoadingIndicator'
import './StartPage.css'

export function StartPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{role: string, content: string, model?: string}>>([])
  const [modelManager] = useState(() => new ModelManager())
  const [currentModel, setCurrentModel] = useState(modelManager.getCurrentModel().id)
  const [isLoading, setIsLoading] = useState(false)
  const [webllmReady, setWebllmReady] = useState(false)
  const [webllmInitializing, setWebllmInitializing] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Check WebLLM status on mount and periodically
  useEffect(() => {
    const checkWebLLMStatus = async () => {
      const status = modelManager.getWebLLMStatus()
      setWebllmInitializing(status.isInitializing)
      
      if (!status.isReady) {
        // Try to initialize WebLLM - this will actually initialize it
        try {
          const ready = await modelManager.isWebLLMReady()
          setWebllmReady(ready)
          setWebllmInitializing(false)
        } catch (error) {
          console.warn('WebLLM initialization check failed:', error)
          setWebllmReady(false)
          setWebllmInitializing(false)
        }
      } else {
        setWebllmReady(true)
        setWebllmInitializing(false)
      }
    }

    checkWebLLMStatus()
    
    // Check periodically until ready (every 1 second for faster response)
    const interval = setInterval(() => {
      if (!webllmReady) {
        checkWebLLMStatus()
      } else {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [modelManager, webllmReady])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!message.trim() || isLoading) return
    
    // STRICT: Block completely if WebLLM is not ready - no fallback messages
    if (!webllmReady) {
      // Don't add any message, just return silently
      // The UI already shows loading state
      return
    }
    
    const userMsg = message
    setMessage('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsLoading(true)

    try {
      const systemPrompt = `You are an advanced ChromeOS security research assistant powered by multiple AI models (Donut-2.5, Qwen-uncensored-v2 via WebLLM, and Bellum/Nacho).

CAPABILITIES:
- Dual-model analysis: Uses both Donut-2.5 and Qwen-uncensored-v2 models for consensus
- Bellum/Nacho integration: Leverages Bellum's VM-based analysis and Nacho utilities
- Enhanced prompting: Specialized prompts based on chromebook-utilities.pages.dev techniques
- Real ChromeOS source code search: Searches https://source.chromium.org/chromiumos/chromiumos/codesearch/

YOUR JOB:
- Help users find vulnerabilities in ChromeOS source code
- When users describe a vulnerability or exploit, help refine their search query
- Explain ChromeOS vulnerability types (OOBE bypass, unenrollment, kernel exploits, etc.)
- Once you understand what they're looking for, tell them to click "Start Analysis"
- The analysis uses multiple AI models and Bellum to find exploits and generate detailed guides

Be friendly, beginner-friendly, and explain security concepts clearly. Reference chromebook-utilities.pages.dev techniques when relevant.`
      
      const response = await modelManager.chat(userMsg, systemPrompt)
      
      // Ensure we always have content, even if it's a fallback
      if (response.content && response.content.trim().length > 0) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.content, model: response.model }])
      } else {
        // If content is empty, provide helpful message
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'm ready to help you find ChromeOS exploits! Based on your query, I recommend:\n\n1. Searching the ChromeOS source code repository\n2. Reviewing chromebook-utilities.pages.dev for similar techniques\n3. Analyzing OOBE and enrollment mechanisms\n\nClick 'Start Analysis' to begin the comprehensive exploit search!", 
          model: response.model 
        }])
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = (error as Error).message;
      
      // If error is about WebLLM not being ready, don't show fallback - just show the error
      if (errorMsg.includes('WebLLM is not ready') || errorMsg.includes('not ready')) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `⏳ ${errorMsg}\n\nPlease wait for the AI model to finish loading. The input will be enabled automatically when ready.` 
        }])
      } else {
        // For other errors, show the error but don't provide fallback content
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `❌ Error: ${errorMsg}\n\nPlease try again once the AI model is ready.` 
        }])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelId = e.target.value
    modelManager.setCurrentModel(newModelId)
    setCurrentModel(newModelId)
  }

  const startAnalysis = () => {
    // Save context for the analysis page
    const lastContext = messages.map(m => `${m.role}: ${m.content}`).join('\n')
    localStorage.setItem('analysisContext', lastContext)
    navigate('/search')
  }

  return (
    <div className="start-page">
      <div className="chat-container">
        <div className="messages-area">
          {messages.length === 0 && (
             <div className="empty-state">
                <h1>🔍 ChromeOS Exploit Finder</h1>
                <p className="subtitle">Search the ChromeOS source code for vulnerabilities and get step-by-step exploit guides</p>
                <div className="example-queries">
                  <h3>💡 Try asking:</h3>
                  <div className="query-examples">
                <button 
                  className="example-query"
                  onClick={() => setMessage("Find me an unenrollment exploit")}
                >
                  Find me an unenrollment exploit
                </button>
                <button 
                  className="example-query"
                  onClick={() => setMessage("Find me a way to escape OOBE to allow pseudounenrollment")}
                >
                  Find me a way to escape OOBE to allow pseudounenrollment
                </button>
                <button 
                  className="example-query"
                  onClick={() => setMessage("find a way to install linux environment even if its blocked by policy")}
                >
                  Find a way to install Linux environment even if it's blocked by policy
                </button>
                <button 
                  className="example-query"
                  onClick={() => setMessage("find a way to enable dev mode even if its blocked by policy")}
                >
                  Find a way to enable dev mode even if it's blocked by policy
                </button>
                  </div>
                </div>
                <div className="info-boxes">
                  <div className="info-box">
                    <strong>🔎 How it works:</strong>
                    <p>I search the official ChromeOS source code repository at source.chromium.org for vulnerabilities matching your description.</p>
                  </div>
                  <div className="info-box">
                    <strong>📖 What you get:</strong>
                    <p>Detailed step-by-step guides on how to exploit any vulnerabilities found, with source code references and payload examples.</p>
                  </div>
                  <div className="info-box">
                    <strong>🎯 Best results:</strong>
                    <p>Be specific! Mention the type of vulnerability (buffer overflow, privilege escalation, etc.) and the component (kernel, browser, etc.).</p>
                  </div>
                </div>
             </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="message-content">
                {m.content}
                {m.model && <div className="model-tag">{m.model}</div>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        
        <div className="input-area">
          <div className="toolbar">
             <select value={currentModel} onChange={handleModelChange} className="model-select">
               {modelManager.getAvailableModels().map(m => (
                 <option key={m.id} value={m.id}>{m.name}</option>
               ))}
             </select>
             {messages.length > 0 && (
               <button className="analysis-btn" onClick={startAnalysis}>
                 Start Analysis <Terminal size={14} />
               </button>
             )}
          </div>
          <div className="input-wrapper">
            <input 
              type="text" 
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder={webllmReady 
                ? "Describe the vulnerability or exploit you want to find (e.g., 'buffer overflow in kernel', 'privilege escalation')..."
                : "⏳ Loading AI model... Please wait..."
              }
              disabled={!webllmReady || isLoading}
            />
            <button 
              className="send-btn" 
              onClick={handleSend} 
              disabled={!webllmReady || isLoading || !message.trim()}
              title={!webllmReady ? "Waiting for AI model to load..." : ""}
            >
              {isLoading ? <Loader2 size={18} className="spinning" /> : <Send size={18} />}
            </button>
          </div>
          {!webllmReady && (
            <div className="webllm-loading-notice">
              {webllmInitializing ? (
                <span>🔄 Initializing AI model (WebLLM)... This may take a moment on first load.</span>
              ) : (
                <span>⏳ Waiting for AI model to be ready...</span>
              )}
            </div>
          )}
        </div>
      </div>
      <ModelLoadingIndicator modelManager={modelManager} />
    </div>
  )
}
