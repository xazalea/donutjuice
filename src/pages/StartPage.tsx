import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Terminal, Loader2, Square, Search, Zap, Brain, FileCode } from 'lucide-react'
import { ModelManager } from '@lib/ai/model-manager'
import { ModelLoadingIndicator } from '../components/ModelLoadingIndicator'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { replaceEmojisWithIcons } from '@lib/utils/emoji-to-icon'
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
  const [aiStatus, setAiStatus] = useState<string>('') // Current AI activity status
  const [abortController, setAbortController] = useState<AbortController | null>(null)
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

  const handleStop = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsLoading(false)
      setAiStatus('Stopped')
      setTimeout(() => setAiStatus(''), 1000)
    }
  }

  const handleSend = async () => {
    if (!message.trim() || isLoading) return
    
    // STRICT: Block completely if WebLLM is not ready - no fallback messages
    if (!webllmReady) {
      // Don't add any message, just return silently
      // The UI already shows loading state
      return
    }
    
    // Create abort controller for this request
    const controller = new AbortController()
    setAbortController(controller)
    
    const userMsg = message
    setMessage('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsLoading(true)
    setAiStatus('Thinking...')

    // Add assistant message placeholder for streaming
    const assistantMessageIndex = messages.length + 1
    setMessages(prev => [...prev, { role: 'assistant', content: '', model: 'streaming' }])

    try {
      const systemPrompt = `You are an elite ChromeOS exploit researcher. You MUST analyze ONLY the code provided in the codebase scan results.

ABSOLUTE RULES - VIOLATION MEANS FAILURE:
1. ONLY use code from the scan results provided - NEVER make up code
2. If scan results show specific files/functions, you MUST reference those EXACTLY
3. NEVER create fake code examples like "bool IsSystemPasswordSafe()" - that's fake
4. NEVER give generic steps like "enable system settings" - that's useless
5. If you don't find real exploit code, say "I need to scan more code" - don't make things up

REAL EXPLOIT ANALYSIS PROCESS:
1. Look at the ACTUAL code provided in the scan results
2. Identify the EXACT functions, file paths, and line numbers shown
3. Analyze the REAL code patterns to find vulnerabilities
4. Chain REAL weaknesses you see in the actual code
5. Provide SPECIFIC exploit steps based on REAL code locations

EXAMPLE OF CORRECT RESPONSE FOR "install linux even if blocked by policy":
"Analyzing codebase scan results:
- Found: crostini_manager.cc line 234 - IsCrostiniEnabled() checks prefs::kCrostiniEnabled
- Found: crostini_util.cc line 456 - EnableCrostini() has developer mode bypass
- Found: crostini_pref_names.cc line 12 - kCrostiniEnabled pref name defined
- Found: policy_service.cc line 189 - PolicyService initialization

EXPLOIT CHAIN:
1. The policy check in IsCrostiniEnabled() reads from prefs (crostini_manager.cc:234)
2. EnableCrostini() bypasses policy if developer mode is enabled (crostini_util.cc:456)
3. The pref 'crostini.enabled' can be manipulated (crostini_pref_names.cc:12)
4. Policy service initialization timing can be exploited (policy_service.cc:189)

EXPLOIT STEPS:
1. Trigger pref service initialization before policy load
2. Set 'crostini.enabled' pref to true via pref manipulation
3. Policy check will read the manipulated pref value
4. Crostini enables despite policy block

This exploit chains: pref manipulation → policy bypass → Linux installation"

IF YOU DON'T SEE REAL CODE IN THE SCAN RESULTS:
- Say "I need more codebase scan results to find a real exploit"
- DO NOT make up fake code
- DO NOT give generic steps

OUTPUT FORMAT:
1. List what you ACTUALLY found in the scan results (file paths, functions, line numbers)
2. Analyze the REAL code to identify vulnerabilities
3. Chain the REAL weaknesses into an exploit
4. Provide SPECIFIC steps based on REAL code locations

REMEMBER: Only use code from the scan results. Never make things up.`
      
      // Streaming callback for real-time updates
      const onStream = (_chunk: string, fullContent: string) => {
        if (controller.signal.aborted) return
        setAiStatus('Generating response...')
        // Update the assistant message in real-time
        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages[assistantMessageIndex]) {
            newMessages[assistantMessageIndex] = {
              role: 'assistant',
              content: fullContent,
              model: 'streaming'
            }
          }
          return newMessages
        })
        // Auto-scroll to bottom
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0)
      }
      
      setAiStatus('Initializing AI model...')
      const response = await modelManager.chat(userMsg, systemPrompt, onStream, controller.signal)
      
      // Final update with complete content
      setAiStatus('Complete!')
      setTimeout(() => setAiStatus(''), 1000)
      setAbortController(null)
      
      // Ensure we always have content
      if (response.content && response.content.trim().length > 0) {
        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages[assistantMessageIndex]) {
            newMessages[assistantMessageIndex] = {
              role: 'assistant',
              content: response.content,
              model: response.model
            }
          }
          return newMessages
        })
      } else {
        // If content is empty, provide helpful message
        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages[assistantMessageIndex]) {
            newMessages[assistantMessageIndex] = {
              role: 'assistant',
              content: "I'm ready to help you find ChromeOS exploits! Based on your query, I recommend:\n\n1. Searching the ChromeOS source code repository\n2. Reviewing chromebook-utilities.pages.dev for similar techniques\n3. Analyzing OOBE and enrollment mechanisms\n\nClick 'Start Analysis' to begin the comprehensive exploit search!",
              model: response.model
            }
          }
          return newMessages
        })
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = (error as Error).message;
      
      // If user aborted, don't show error
      if (errorMsg === 'Request aborted by user') {
        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages[assistantMessageIndex]) {
            newMessages[assistantMessageIndex] = {
              role: 'assistant',
              content: 'Response stopped by user.',
              model: 'stopped'
            }
          }
          return newMessages
        })
      } else if (errorMsg.includes('WebLLM is not ready') || errorMsg.includes('not ready')) {
        // If error is about WebLLM not being ready, don't show fallback - just show the error
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
                <h1><Search size={32} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /> ChromeOS Exploit Finder</h1>
                <p className="subtitle">Search the ChromeOS source code for vulnerabilities and get step-by-step exploit guides</p>
                <div className="example-queries">
                  <h3><Brain size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /> Try asking:</h3>
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
                    <strong><Search size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> How it works:</strong>
                    <p>I search the official ChromeOS source code repository at source.chromium.org for vulnerabilities matching your description.</p>
                  </div>
                  <div className="info-box">
                    <strong><FileCode size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> What you get:</strong>
                    <p>Detailed step-by-step guides on how to exploit any vulnerabilities found, with source code references and payload examples.</p>
                  </div>
                  <div className="info-box">
                    <strong><Zap size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> Best results:</strong>
                    <p>Be specific! Mention the type of vulnerability (buffer overflow, privilege escalation, etc.) and the component (kernel, browser, etc.).</p>
                  </div>
                </div>
             </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="message-content">
                {m.content ? (
                  m.role === 'assistant' ? (
                    <MarkdownRenderer content={m.content} />
                  ) : (
                    <div>{replaceEmojisWithIcons(m.content)}</div>
                  )
                ) : (m.role === 'assistant' && m.model === 'streaming' ? (
                  <span className="typing-indicator">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </span>
                ) : null)}
                {m.model && m.model !== 'streaming' && m.model !== 'stopped' && <div className="model-tag">{m.model}</div>}
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
            {isLoading && abortController ? (
              <button 
                className="stop-btn" 
                onClick={handleStop}
                title="Stop AI response"
              >
                <Square size={18} />
              </button>
            ) : (
              <button 
                className="send-btn" 
                onClick={handleSend} 
                disabled={!webllmReady || isLoading || !message.trim()}
                title={!webllmReady ? "Waiting for AI model to load..." : ""}
              >
                {isLoading ? <Loader2 size={18} className="spinning" /> : <Send size={18} />}
              </button>
            )}
          </div>
          {aiStatus && (
            <div className="ai-status-indicator">
              <Loader2 size={14} className="spinning" />
              <span>{aiStatus}</span>
            </div>
          )}
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
