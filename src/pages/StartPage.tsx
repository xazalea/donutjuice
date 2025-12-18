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
      const systemPrompt = `You are an elite ChromeOS exploit researcher. You will receive ACTUAL ChromeOS source code in the codebase scan results below.

CRITICAL: You MUST start your response by listing EXACTLY what code you found in the scan results. Then analyze that REAL code to find exploits.

ABSOLUTE REQUIREMENTS:
1. FIRST: List every file path, function name, and line number from the scan results
2. THEN: Analyze ONLY that real code to find vulnerabilities
3. NEVER mention apt-get, dpkg, yum, virtualbox, or any generic Linux tools - this is ChromeOS, not Linux
4. NEVER give generic installation steps - analyze the ACTUAL ChromeOS code provided
5. If scan results show code, you MUST reference it EXACTLY with file paths and line numbers
6. If you don't see code in scan results, say "No code found in scan results, need more codebase data"

REQUIRED RESPONSE FORMAT:
"CODEBASE SCAN RESULTS FOUND:
1. File: [exact path from scan] Line [number]: [exact function name]() - [what code does]
2. File: [exact path from scan] Line [number]: [exact function name]() - [what code does]
3. [Continue listing ALL code from scan results]

VULNERABILITY ANALYSIS:
[Analyze the REAL code you listed above to find actual vulnerabilities]

EXPLOIT CHAIN (based on REAL code):
1. [Step using exact file/function from scan results]
2. [Step chaining real vulnerabilities found]
3. [Step to complete exploit using real code locations]

EXPLOIT STEPS (ChromeOS-specific):
1. [Actionable ChromeOS exploit step with real file/function reference]
2. [Actionable ChromeOS exploit step with real code location]
3. [Actionable ChromeOS exploit step to achieve goal]"

FORBIDDEN RESPONSES:
- "sudo apt-get" - this is Linux, not ChromeOS
- "virtualbox" - not relevant to ChromeOS
- Generic installation steps
- Any response that doesn't reference actual code from scan results

REMEMBER: You will receive codebase scan results. You MUST use that real code. This is ChromeOS, not generic Linux.`
      
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
                <p className="subtitle">AI-powered tool that scans the entire ChromeOS source code to find real vulnerabilities and provides step-by-step exploit guides</p>
                <div className="info-box">
                  <p><strong>How it works:</strong></p>
                  <ul>
                    <li>🔍 Scans ChromeOS and Chromium source code repositories</li>
                    <li>🧠 Uses AI to analyze code patterns and find vulnerabilities</li>
                    <li>🔗 Chains multiple vulnerabilities into complete exploits</li>
                    <li>📝 Provides detailed, actionable exploit guides with real code references</li>
                  </ul>
                </div>
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
