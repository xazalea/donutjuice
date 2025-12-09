import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal } from 'lucide-react'
import { ModelManager } from '@lib/ai/model-manager'
import './SearchPage.css'

export function SearchPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [modelManager] = useState(() => new ModelManager())

  useEffect(() => {
    let mounted = true
    const currentLogs: string[] = []

    const addLog = (text: string) => {
      if (!mounted) return
      setLogs(prev => [...prev, text])
      currentLogs.push(text)
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
      }
    }

    const runRealAnalysis = async () => {
      const wc = (window as any).webcontainerInstance
      
      if (!wc) {
        addLog("Error: WebContainer environment not ready.")
        return
      }

      addLog("Initializing Dynamic Analysis Engine...")
      
      // 1. Context Gathering
      const context = localStorage.getItem('analysisContext') || 'General system scan'
      addLog("Context loaded. Generating probe payload...")

      // 2. AI Code Generation (Real)
      try {
        const prompt = `
          You are a security engineer. 
          CONTEXT: ${context}
          
          TASK: Write a Node.js script to gather extensive system information from the current environment. 
          The script should:
          1. Collect OS info (os.platform, os.release, os.userInfo)
          2. Check environment variables
          3. List files in the current directory
          4. Check for 'su', 'sudo', 'docker' binaries if possible
          5. Simulate a vulnerability check based on the context (e.g., if context mentions 'cookies', try to read mock cookies)
          
          OUTPUT: Return ONLY the raw JavaScript code. No markdown formatting. No comments before/after.
        `
        const { content: scriptCode } = await modelManager.chat(prompt, "You are a code generator. Output only code.")
        
        // Clean up code if it has markdown blocks
        const cleanCode = scriptCode.replace(/```javascript/g, '').replace(/```/g, '').trim()

        addLog("Payload generated. Writing to virtual filesystem...")
        await wc.fs.writeFile('probe.js', cleanCode)

        addLog("Executing payload...")
        const process = await wc.spawn('node', ['probe.js'])
        
        process.output.pipeTo(new WritableStream({
          write(data) {
            addLog(data)
          }
        }))

        const exitCode = await process.exit
        addLog(`Probe finished with exit code ${exitCode}.`)

        // 3. Analyze Results & Generate Real Exploit Strategy
        addLog("Analyzing probe telemetry...")
        
        const probeOutput = currentLogs.join('\n')
        
        const exploitPrompt = `
          Analyze the following system probe output from a ChromeOS/Linux environment:
          
          ${probeOutput.substring(0, 5000)}
          
          Based on this, generate a specific exploit strategy.
          
          OUTPUT JSON FORMAT ONLY:
          {
            "exploitName": "Name of the exploit",
            "severity": "critical" | "high" | "medium",
            "description": "Brief description of what was found",
            "payloadFilename": "exploit.sh" or "payload.js",
            "payloadCode": "The actual code to run (shell or nodejs)",
            "steps": [
              { "title": "Step 1 title", "description": "Detailed instruction for step 1" },
              { "title": "Step 2 title", "description": "Detailed instruction for step 2" }
            ]
          }
        `
        
        const { content: exploitStrategyJson } = await modelManager.chat(exploitPrompt, "You are a senior exploit developer. Output valid JSON only.")
        
        try {
            // Try to parse JSON, handling potential markdown wrappers
            const jsonStr = exploitStrategyJson.replace(/```json/g, '').replace(/```/g, '').trim()
            const strategy = JSON.parse(jsonStr)
            
            // Store for ExploitPage
            localStorage.setItem('exploitStrategy', JSON.stringify(strategy))
            
            // Write the actual exploit payload to the container so it's ready
            if (strategy.payloadFilename && strategy.payloadCode) {
                addLog(`Staging exploit payload: ${strategy.payloadFilename}...`)
                await wc.fs.writeFile(strategy.payloadFilename, strategy.payloadCode)
            }
            
            setTimeout(() => {
              if (mounted) navigate('/exploit')
            }, 1000)
            
        } catch (jsonError) {
            addLog("Error parsing exploit strategy. Retrying...")
            console.error(jsonError, exploitStrategyJson)
            // Fallback or retry logic could go here
             setTimeout(() => {
              if (mounted) navigate('/exploit')
            }, 2000)
        }

      } catch (e) {
        addLog(`Analysis Error: ${(e as Error).message}`)
      }
    }

    runRealAnalysis()

    return () => { mounted = false }
  }, [navigate, modelManager])

  return (
    <div className="search-page">
      <div className="terminal-container">
        <div className="terminal-bar">
          <Terminal size={14} />
          <span>analysis_engine — node probe.js</span>
        </div>
        <div className="terminal-content" ref={containerRef}>
          {logs.map((log, i) => (
            <div key={i} className="log-line">{log}</div>
          ))}
          <div className="cursor-block"></div>
        </div>
      </div>
    </div>
  )
}
