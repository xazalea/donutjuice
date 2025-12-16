import { useState, useEffect } from 'react'
import { Loader2, Download, CheckCircle2, AlertCircle } from 'lucide-react'
import { ModelManager } from '@lib/ai/model-manager'
import './ModelLoadingIndicator.css'

interface ModelLoadingIndicatorProps {
  modelManager: ModelManager
  onStatusChange?: (status: LoadingStatus) => void
}

export interface LoadingStatus {
  isInitializing: boolean
  progress: number
  status: 'idle' | 'downloading' | 'initializing' | 'ready' | 'error'
  message: string
  modelName: string
}

export function ModelLoadingIndicator({ modelManager, onStatusChange }: ModelLoadingIndicatorProps) {
  const [status, setStatus] = useState<LoadingStatus>({
    isInitializing: false,
    progress: 0,
    status: 'idle',
    message: '',
    modelName: '',
  })

  useEffect(() => {
    const checkStatus = async () => {
      const webllm = modelManager.getWebLLM()
      if (!webllm) return

      const initStatus = webllm.getInitStatus()
      
      // Monitor initialization progress
      if (initStatus.initializing) {
        setStatus(prev => ({
          ...prev,
          isInitializing: true,
          status: 'initializing',
          message: `Initializing ${initStatus.model}...`,
          modelName: initStatus.model,
        }))
      } else if (initStatus.initialized) {
        setStatus(prev => ({
          ...prev,
          isInitializing: false,
          status: 'ready',
          message: `${initStatus.model} ready`,
          modelName: initStatus.model,
          progress: 100,
        }))
      } else {
        setStatus(prev => ({
          ...prev,
          isInitializing: false,
          status: 'idle',
          message: '',
          modelName: '',
          progress: 0,
        }))
      }

      // Call callback if provided
      if (onStatusChange) {
        onStatusChange(status)
      }
    }

    // Check status periodically
    const interval = setInterval(checkStatus, 500)
    checkStatus() // Initial check

    return () => clearInterval(interval)
  }, [modelManager, onStatusChange, status])

  // Listen for WebLLM progress events
  useEffect(() => {
    const handleProgress = (event: CustomEvent) => {
      const { progress, message } = event.detail
      setStatus(prev => ({
        ...prev,
        progress: progress || prev.progress,
        message: message || prev.message,
        status: progress < 100 ? 'downloading' : 'initializing',
      }))
    }

    window.addEventListener('webllm-progress', handleProgress as EventListener)
    return () => window.removeEventListener('webllm-progress', handleProgress as EventListener)
  }, [])

  if (status.status === 'idle' || status.status === 'ready') {
    return null // Don't show when idle or ready
  }

  return (
    <div className="model-loading-indicator">
      <div className="loading-content">
        <div className="loading-icon">
          {status.status === 'error' ? (
            <AlertCircle size={20} className="error-icon" />
          ) : status.status === 'ready' ? (
            <CheckCircle2 size={20} className="success-icon" />
          ) : (
            <Loader2 size={20} className="spinning" />
          )}
        </div>
        <div className="loading-text">
          <div className="loading-title">
            {status.status === 'downloading' && <Download size={14} />}
            {status.status === 'initializing' && <Loader2 size={14} className="spinning" />}
            <span>{status.message || 'Loading AI model...'}</span>
          </div>
          {status.progress > 0 && status.progress < 100 && (
            <div className="loading-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <span className="progress-text">{Math.round(status.progress)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

