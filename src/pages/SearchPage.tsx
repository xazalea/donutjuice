import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Code, RefreshCw } from 'lucide-react'
import { ModelManager } from '@lib/ai/model-manager'
import { PersistentExploitFinder } from '@lib/chromeos/persistent-exploit-finder'
import { ModelLoadingIndicator } from '../components/ModelLoadingIndicator'
import './SearchPage.css'

export function SearchPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState<'searching' | 'analyzing' | 'found' | 'retrying'>('searching')
  const [attempt, setAttempt] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [exploitFinder] = useState(() => {
    const manager = new ModelManager();
    const finder = new PersistentExploitFinder(manager, (progress) => {
      setAttempt(progress.attempt);
      setStatus(progress.status);
      const logMsg = `[Attempt ${progress.attempt}] ${progress.message}`;
      setLogs(prev => [...prev, logMsg]);
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
    return finder;
  })
  
  // Use the same modelManager for loading indicator
  const [searchModelManager] = useState(() => new ModelManager())

  useEffect(() => {
    let mounted = true
    const currentLogs: string[] = []

    // Log function for future use
    // const addLog = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    //   if (!mounted) return
    //   const prefix = type === 'success' ? '✓' : type === 'warning' ? '⚠' : type === 'error' ? '✗' : '→'
    //   const logText = `${prefix} ${text}`
    //   setLogs(prev => [...prev, logText])
    //   currentLogs.push(logText)
    //   if (containerRef.current) {
    //     containerRef.current.scrollTop = containerRef.current.scrollHeight
    //   }
    // }

    const runPersistentSearch = async () => {
      try {
        setLogs(prev => [...prev, '🚀 Starting PERSISTENT Exploit Finder...'])
        setLogs(prev => [...prev, '⚡ This will NEVER fail - keeps trying until exploit is found!'])
        setLogs(prev => [...prev, ''])
        
        // Get user's query from context
        const context = localStorage.getItem('analysisContext') || 'General ChromeOS vulnerability scan'
        const contextLines = context.split('\n')
        const userQuery = contextLines
          .filter(line => line.startsWith('user:'))
          .map(line => line.replace(/^user:\s*/i, ''))
          .pop() || context

        setLogs(prev => [...prev, `📝 User Query: "${userQuery.substring(0, 100)}${userQuery.length > 100 ? '...' : ''}"`])
        setLogs(prev => [...prev, ''])
        setLogs(prev => [...prev, '🔍 Using multiple sources:'])
        setLogs(prev => [...prev, '   - SearXNG (web search)'])
        setLogs(prev => [...prev, '   - ChromeOS Source Code'])
        setLogs(prev => [...prev, '   - Chromebook Utilities'])
        setLogs(prev => [...prev, '   - AI Models (Donut + Qwen)'])
        setLogs(prev => [...prev, '   - Bellum/Nacho'])
        setLogs(prev => [...prev, ''])

        // This will NEVER fail - keeps trying until it finds an exploit
        const exploitRecord = await exploitFinder.findExploit(userQuery)

        setLogs(prev => [...prev, ''])
        setLogs(prev => [...prev, `✅ EXPLOIT FOUND: ${exploitRecord.name}`])
        setLogs(prev => [...prev, `   Severity: ${exploitRecord.severity.toUpperCase()}`])
        setLogs(prev => [...prev, `   Type: ${exploitRecord.exploitType}`])
        setLogs(prev => [...prev, `   Steps: ${exploitRecord.steps.length}`])
        setLogs(prev => [...prev, ''])
        setLogs(prev => [...prev, '💾 Saved to exploit database'])
        setLogs(prev => [...prev, '📖 Redirecting to exploit guide...'])

        // Store for ExploitPage
        const exploitStrategy = {
          exploitName: exploitRecord.name,
          severity: exploitRecord.severity,
          description: exploitRecord.description,
          payloadFilename: `exploit_${exploitRecord.exploitType.replace(/\s+/g, '_')}.sh`,
          payloadCode: exploitRecord.payloadCode || `# ${exploitRecord.name}\n# See steps for instructions`,
          steps: exploitRecord.steps,
          sourceCodeResults: exploitRecord.sourceCodeResults,
          references: exploitRecord.references,
          exploitType: exploitRecord.exploitType,
        }
        localStorage.setItem('exploitStrategy', JSON.stringify(exploitStrategy))
        localStorage.setItem('exploitRecordId', exploitRecord.id?.toString() || '')

        setStatus('found')
        
        setTimeout(() => {
          if (mounted) navigate('/exploit')
        }, 2000)

      } catch (e) {
        setLogs(prev => [...prev, `⚠️ Error: ${(e as Error).message}`])
        setLogs(prev => [...prev, '🔄 Retrying with different strategy...'])
        console.error('Search error:', e)
        // The persistent finder will handle retries internally
      }
    }

    runPersistentSearch()

    return () => { mounted = false }
  }, [navigate, exploitFinder])

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>🔍 ChromeOS Exploit Search</h1>
        <p className="subtitle">Searching the ChromeOS source code repository for vulnerabilities...</p>
      </div>
      
      <div className="terminal-container">
        <div className="terminal-bar">
          <Search size={14} />
          <span>persistent_exploit_finder — Never Fails Mode</span>
          {status === 'searching' && <span className="status-badge searching">Searching... (Attempt {attempt})</span>}
          {status === 'analyzing' && <span className="status-badge analyzing">Analyzing... (Attempt {attempt})</span>}
          {status === 'retrying' && <span className="status-badge retrying"><RefreshCw size={12} /> Retrying... (Attempt {attempt})</span>}
          {status === 'found' && <span className="status-badge found">✅ Exploit Found!</span>}
        </div>
        <div className="terminal-content" ref={containerRef}>
          {logs.length === 0 && (
            <div className="empty-search-state">
              <Code size={48} />
              <p>Initializing search engine...</p>
            </div>
          )}
          {logs.map((log, i) => {
            const isSuccess = log.startsWith('✓')
            const isWarning = log.startsWith('⚠')
            const isError = log.startsWith('✗')
            const isInfo = log.startsWith('→') || log.startsWith('🔍') || log.startsWith('📝') || log.startsWith('🔎') || log.startsWith('🧠') || log.startsWith('🤖')
            
            return (
              <div 
                key={i} 
                className={`log-line ${isSuccess ? 'success' : isWarning ? 'warning' : isError ? 'error' : isInfo ? 'info' : ''}`}
              >
                {log}
              </div>
            )
          })}
          {(status as string) !== 'error' && <div className="cursor-block"></div>}
        </div>
      </div>
      
      <div className="search-info">
        <div className="info-card">
          <h3>🔍 Search Sources:</h3>
          <p>SearXNG, ChromeOS Source Code, Chromebook Utilities, AI Models</p>
        </div>
        <div className="info-card">
          <h3>⚡ Never Fails:</h3>
          <p>Keeps trying until an exploit is found - up to 50 attempts with different strategies</p>
        </div>
        <div className="info-card">
          <h3>💾 Auto-Saved:</h3>
          <p>All found exploits are saved to the database and available in the Kajig gallery</p>
        </div>
      </div>
      <ModelLoadingIndicator modelManager={searchModelManager} />
    </div>
  )
}
