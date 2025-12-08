import { useState } from 'react'
import { AIInferenceEngine } from '@lib/ai'
import './AIPanel.css'

export function AIPanel() {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [apiKey, setApiKey] = useState('')
  const [deviceData, setDeviceData] = useState('')

  const handleAnalyze = async () => {
    if (!deviceData) {
      alert('Please enter device data to analyze')
      return
    }

    setAnalyzing(true)
    setAnalysisResult(null)

    try {
      const aiEngine = new AIInferenceEngine(apiKey || undefined)
      const result = await aiEngine.analyzeDeviceData(deviceData)
      setAnalysisResult(result)
    } catch (error) {
      console.error('AI analysis error:', error)
      alert('Analysis failed: ' + (error as Error).message)
    } finally {
      setAnalyzing(false)
    }
  }

  const collectDeviceData = () => {
    const data = {
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

    setDeviceData(JSON.stringify(data, null, 2))
  }

  return (
    <div className="ai-panel">
      <div className="ai-controls">
        <div className="api-key-input">
          <input
            type="password"
            placeholder="API Key for donut-2.5 (optional)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={analyzing}
          />
        </div>
        <div className="model-info">
          <span className="model-name">donut-2.5</span>
        </div>
        <button onClick={collectDeviceData} disabled={analyzing}>
          Collect Device Data
        </button>
      </div>

      <div className="device-data-input">
        <textarea
          placeholder="Device data to analyze (or click 'Collect Device Data')..."
          value={deviceData}
          onChange={(e) => setDeviceData(e.target.value)}
          disabled={analyzing}
          rows={8}
        />
      </div>

      <button
        className="analyze-button"
        onClick={handleAnalyze}
        disabled={analyzing || !deviceData}
      >
        {analyzing ? 'Analyzing with donut-2.5...' : 'Analyze with donut-2.5'}
      </button>

      {analysisResult && (
        <div className="analysis-result">
          <h3>donut-2.5 Analysis Results</h3>
          <div className="confidence">
            Confidence: {(analysisResult.confidence * 100).toFixed(1)}%
          </div>

          {analysisResult.vulnerabilities.length > 0 && (
            <div className="vulnerabilities">
              <h4>Vulnerabilities Found:</h4>
              <ul>
                {analysisResult.vulnerabilities.map((vuln: string, index: number) => (
                  <li key={index}>{vuln}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.recommendations.length > 0 && (
            <div className="recommendations">
              <h4>Recommendations:</h4>
              <ul>
                {analysisResult.recommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          <details className="raw-response">
            <summary>Raw AI Response</summary>
            <pre>{analysisResult.rawResponse}</pre>
          </details>
        </div>
      )}
    </div>
  )
}

