import { useState, useEffect } from 'react'
import { Database, Search, AlertTriangle, ExternalLink, Download, Filter, ThumbsUp, TestTube, Shield, Crown } from 'lucide-react'
import { ExploitDatabase, ExploitRecord } from '@lib/database/exploit-db'
import './KajigPage.css'

export function KajigPage() {
  const [exploits, setExploits] = useState<ExploitRecord[]>([])
  const [filteredExploits, setFilteredExploits] = useState<ExploitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [selectedExploit, setSelectedExploit] = useState<ExploitRecord | null>(null)
  const [database] = useState(() => new ExploitDatabase())

  useEffect(() => {
    loadExploits()
  }, [])

  useEffect(() => {
    filterExploits()
  }, [exploits, searchQuery, severityFilter])

  const loadExploits = async () => {
    try {
      setLoading(true)
      const allExploits = await database.getAllExploits()
      // Sort by date, newest first
      allExploits.sort((a, b) => 
        new Date(b.foundAt).getTime() - new Date(a.foundAt).getTime()
      )
      setExploits(allExploits)
    } catch (error) {
      console.error('Error loading exploits:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterExploits = () => {
    let filtered = [...exploits]

    // Search filter
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(queryLower) ||
        e.description.toLowerCase().includes(queryLower) ||
        e.searchQuery.toLowerCase().includes(queryLower) ||
        e.exploitType.toLowerCase().includes(queryLower)
      )
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(e => e.severity === severityFilter)
    }

    setFilteredExploits(filtered)
  }

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: '#f85149',
      high: '#f0883e',
      medium: '#d29922',
      low: '#3fb950',
    }
    return colors[severity] || '#8b949e'
  }

  const downloadExploit = (exploit: ExploitRecord) => {
    const content = `# ${exploit.name}\n\n${exploit.description}\n\n## Steps\n\n${exploit.steps.map((s, i) => `${i + 1}. ${s.title}\n   ${s.description}`).join('\n\n')}\n\n${exploit.payloadCode ? `## Payload\n\n\`\`\`\n${exploit.payloadCode}\n\`\`\`` : ''}`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exploit.name.replace(/[^a-z0-9]/gi, '_')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleReaction = async (exploit: ExploitRecord, reaction: 'found' | 'tested' | 'patched' | 'goated') => {
    if (!exploit.id) return;

    try {
      await database.addReaction(exploit.id, reaction);
      // Reload exploits to get updated reactions
      await loadExploits();
    } catch (error: any) {
      if (error.message?.includes('goated')) {
        alert('You can only have one goated exploit! Remove your current goated reaction first.');
      } else {
        console.error('Error adding reaction:', error);
      }
    }
  }

  const handleRemoveReaction = async (exploit: ExploitRecord) => {
    if (!exploit.id) return;

    try {
      await database.removeReaction(exploit.id);
      await loadExploits();
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }

  if (loading) {
    return (
      <div className="kajig-page">
        <div className="loading-state">
          <Database size={48} />
          <p>Loading exploit database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="kajig-page">
      <div className="kajig-header">
        <div className="header-content">
          <h1>
            <Database size={32} />
            Exploit Gallery (Kajig)
          </h1>
          <p>All discovered ChromeOS exploits - {exploits.length} total</p>
        </div>
      </div>

      <div className="kajig-filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search exploits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {selectedExploit ? (
        <div className="exploit-detail-view">
          <button 
            className="back-button"
            onClick={() => setSelectedExploit(null)}
          >
            ← Back to Gallery
          </button>
          
          <div className="exploit-detail">
            <div className="detail-header">
              <div className={`severity-badge ${selectedExploit.severity}`} style={{ backgroundColor: getSeverityColor(selectedExploit.severity) }}>
                {selectedExploit.severity.toUpperCase()}
              </div>
              <div className="detail-actions">
                <button 
                  className="action-btn"
                  onClick={() => downloadExploit(selectedExploit)}
                >
                  <Download size={18} /> Download
                </button>
              </div>
            </div>

            <div className="reactions-section">
              <h3>Reactions</h3>
              <div className="reactions-grid">
                <button
                  className={`reaction-btn ${selectedExploit.reactions?.userReaction === 'found' ? 'active' : ''}`}
                  onClick={() => {
                    if (selectedExploit.reactions?.userReaction === 'found') {
                      handleRemoveReaction(selectedExploit);
                    } else {
                      handleReaction(selectedExploit, 'found');
                    }
                  }}
                >
                  <ThumbsUp size={20} />
                  <span>Found</span>
                  <span className="reaction-count">{selectedExploit.reactions?.found || 0}</span>
                </button>
                <button
                  className={`reaction-btn ${selectedExploit.reactions?.userReaction === 'tested' ? 'active' : ''}`}
                  onClick={() => {
                    if (selectedExploit.reactions?.userReaction === 'tested') {
                      handleRemoveReaction(selectedExploit);
                    } else {
                      handleReaction(selectedExploit, 'tested');
                    }
                  }}
                >
                  <TestTube size={20} />
                  <span>Tested</span>
                  <span className="reaction-count">{selectedExploit.reactions?.tested || 0}</span>
                </button>
                <button
                  className={`reaction-btn ${selectedExploit.reactions?.userReaction === 'patched' ? 'active' : ''}`}
                  onClick={() => {
                    if (selectedExploit.reactions?.userReaction === 'patched') {
                      handleRemoveReaction(selectedExploit);
                    } else {
                      handleReaction(selectedExploit, 'patched');
                    }
                  }}
                >
                  <Shield size={20} />
                  <span>Patched</span>
                  <span className="reaction-count">{selectedExploit.reactions?.patched || 0}</span>
                </button>
                <button
                  className={`reaction-btn goated ${selectedExploit.reactions?.userReaction === 'goated' ? 'active' : ''}`}
                  onClick={() => {
                    if (selectedExploit.reactions?.userReaction === 'goated') {
                      handleRemoveReaction(selectedExploit);
                    } else {
                      handleReaction(selectedExploit, 'goated');
                    }
                  }}
                >
                  <Crown size={20} />
                  <span>Goated</span>
                  <span className="reaction-count">{selectedExploit.reactions?.goated || 0}</span>
                </button>
              </div>
              {selectedExploit.reactions?.userReaction && (
                <p className="reaction-note">
                  Your reaction: <strong>{selectedExploit.reactions.userReaction}</strong>
                  {selectedExploit.reactions.userReaction === 'goated' && ' (You can only have one goated exploit)'}
                </p>
              )}
            </div>

            <h2>{selectedExploit.name}</h2>
            <p className="exploit-description">{selectedExploit.description}</p>

            <div className="exploit-meta">
              <span><strong>Type:</strong> {selectedExploit.exploitType}</span>
              <span><strong>Found:</strong> {new Date(selectedExploit.foundAt).toLocaleDateString()}</span>
              <span><strong>Status:</strong> {selectedExploit.status}</span>
            </div>

            <div className="exploit-steps">
              <h3>Step-by-Step Guide</h3>
              {selectedExploit.steps.map((step, index) => (
                <div key={index} className="step-card">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-content">
                    <h4>{step.title}</h4>
                    <p>{step.description}</p>
                    {step.code && (
                      <pre className="step-code"><code>{step.code}</code></pre>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedExploit.sourceCodeResults && selectedExploit.sourceCodeResults.length > 0 && (
              <div className="source-references">
                <h3>Source Code References</h3>
                {selectedExploit.sourceCodeResults.map((ref, idx) => (
                  <a
                    key={idx}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    <ExternalLink size={16} />
                    {ref.file}:{ref.lineNumber}
                  </a>
                ))}
              </div>
            )}

            {selectedExploit.references && selectedExploit.references.length > 0 && (
              <div className="references">
                <h3>References</h3>
                {selectedExploit.references.map((ref, idx) => (
                  <a
                    key={idx}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="reference-link"
                  >
                    <ExternalLink size={16} />
                    {ref.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="exploits-grid">
          {filteredExploits.length === 0 ? (
            <div className="empty-state">
              <Database size={64} />
              <h2>No exploits found</h2>
              <p>
                {searchQuery || severityFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start searching to find ChromeOS exploits!'}
              </p>
            </div>
          ) : (
            filteredExploits.map((exploit) => (
              <div
                key={exploit.id}
                className="exploit-card"
                onClick={() => setSelectedExploit(exploit)}
              >
                <div className="card-header">
                  <div
                    className={`severity-indicator ${exploit.severity}`}
                    style={{ backgroundColor: getSeverityColor(exploit.severity) }}
                  />
                  <span className="exploit-type">{exploit.exploitType}</span>
                </div>
                <h3>{exploit.name}</h3>
                <p className="card-description">
                  {exploit.description.substring(0, 150)}
                  {exploit.description.length > 150 ? '...' : ''}
                </p>
                <div className="card-footer">
                  <span className="card-date">
                    {new Date(exploit.foundAt).toLocaleDateString()}
                  </span>
                  <span className={`status-badge ${exploit.status}`}>
                    {exploit.status}
                  </span>
                </div>
                {exploit.reactions && (
                  <div className="card-reactions">
                    {exploit.reactions.found > 0 && (
                      <span className="mini-reaction" title="Found">
                        <ThumbsUp size={14} /> {exploit.reactions.found}
                      </span>
                    )}
                    {exploit.reactions.tested > 0 && (
                      <span className="mini-reaction" title="Tested">
                        <TestTube size={14} /> {exploit.reactions.tested}
                      </span>
                    )}
                    {exploit.reactions.patched > 0 && (
                      <span className="mini-reaction" title="Patched">
                        <Shield size={14} /> {exploit.reactions.patched}
                      </span>
                    )}
                    {exploit.reactions.goated > 0 && (
                      <span className="mini-reaction goated" title="Goated">
                        <Crown size={14} /> {exploit.reactions.goated}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

