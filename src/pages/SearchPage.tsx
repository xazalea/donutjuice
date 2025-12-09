import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal } from 'lucide-react'
import './SearchPage.css'

export function SearchPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<string[]>([])
  const [currentAction, setCurrentAction] = useState('Initializing virtual environment...')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true
    
    const runAnalysis = async () => {
      const wc = (window as any).webcontainerInstance
      
      const addLog = (text: string) => {
        if (!mounted) return
        setLogs(prev => [...prev, `> ${text}`])
        containerRef.current?.scrollTo(0, containerRef.current.scrollHeight)
      }

      try {
        if (!wc) {
          addLog("WebContainer not initialized. Running in simulation mode...")
        } else {
          addLog("Mounting virtual filesystem...")
          // Create a dummy analysis script
          await wc.fs.writeFile('analyze.js', `
            console.log('Mounting /proc filesystem...');
            console.log('Scanning memory pages for unmapped regions...');
            console.log('Analyzing SUID binaries...');
            setTimeout(() => console.log('Checking /etc/shadow permissions...'), 500);
            setTimeout(() => console.log('Found potential race condition in network stack...'), 1200);
            setTimeout(() => console.log('Compiling exploit payload...'), 2000);
          `)
          
          addLog("Executing Node.js analysis engine...")
          const process = await wc.spawn('node', ['analyze.js'])
          
          process.output.pipeTo(new WritableStream({
            write(data) {
              addLog(data)
            }
          }))

          await process.exit
        }

        // Simulate additional vigorous scanning steps
        const steps = [
          "Injecting probe into ChromeOS kernel module...",
          "Bypassing verified boot signature check...",
          "Fuzzing input methods for buffer overflows...",
          "Deep scanning stateful partition...",
          "Analyzing OOBE configuration blobs...",
          "CRITICAL: Vulnerability signature detected!",
          "Generating exploit chain..."
        ]

        for (const step of steps) {
          if (!mounted) return
          setCurrentAction(step)
          addLog(step)
          await new Promise(r => setTimeout(r, 800 + Math.random() * 1000))
        }

        if (mounted) {
          setTimeout(() => navigate('/exploit'), 1000)
        }

      } catch (error) {
        addLog(`Error: ${(error as Error).message}`)
        setTimeout(() => navigate('/exploit'), 2000) // Proceed anyway
      }
    }

    runAnalysis()

    return () => { mounted = false }
  }, [navigate])

  return (
    <div className="search-page">
      <div className="search-status">
        <div className="pulse-ring"></div>
        <h2>{currentAction}</h2>
        <p>DO NOT CLOSE THIS WINDOW. AI Agent is interacting with low-level OS APIs.</p>
      </div>

      <div className="terminal-window">
        <div className="terminal-header">
          <Terminal size={14} />
          <span>root@donut-vm:~# node analyze.js --aggressive</span>
        </div>
        <div className="terminal-body" ref={containerRef}>
          {logs.map((log, i) => (
            <div key={i} className="log-line">{log}</div>
          ))}
          <div className="cursor-blink">_</div>
        </div>
      </div>
    </div>
  )
}

