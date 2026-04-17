'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  Clock,
  GitBranch,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Search,
  FileText,
  Sparkles,
  GitCompare,
  Download,
  Settings,
  Trash2,
} from 'lucide-react'
import ReleaseNotesTask from '@/components/tasks/ReleaseNotesTask'
import { apiFetchWithRetry } from '@/lib/fetchWithRetry'

interface RecentTask {
  task_id: string
  repo_name: string
  base_branch: string
  head_branch: string
  status: string
  created_at: string | null
  current_stage: number | null
  progress_percent: number
}

type FilterTab = 'all' | 'executing' | 'completed' | 'failed'

const STAGE_LABELS: Record<number, string> = {
  1: 'Clone & Diff',
  2: 'AI Analysis',
  3: 'Release Notes',
  4: 'Migration',
  5: 'Package',
}

export default function Home() {
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showTask, setShowTask] = useState(false)
  const [taskKey, setTaskKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const fetchRecent = useCallback(async () => {
    try {
      const resp = await apiFetchWithRetry('/api/release-notes/recent')
      if (resp.ok) {
        const data = await resp.json()
        setRecentTasks(data)
      }
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    fetchRecent()
    const interval = setInterval(fetchRecent, 15000)
    return () => clearInterval(interval)
  }, [fetchRecent])

  const handleNewTask = () => {
    setSelectedTaskId(null)
    setShowTask(true)
    setTaskKey(k => k + 1)
  }

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    setShowTask(true)
    setTaskKey(k => k + 1)
  }

  const handleBackToHome = () => {
    setShowTask(false)
    setSelectedTaskId(null)
    fetchRecent()
  }

  const handleDeleteTask = useCallback(async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    try {
      const resp = await apiFetchWithRetry(`/api/release-notes/${taskId}`, { method: 'DELETE' })
      if (resp.ok) {
        if (selectedTaskId === taskId) {
          setShowTask(false)
          setSelectedTaskId(null)
        }
        fetchRecent()
      }
    } catch {
      // silently ignore
    }
  }, [selectedTaskId, fetchRecent])

  // Filter counts
  const counts = useMemo(() => {
    const all = recentTasks.length
    const executing = recentTasks.filter(t => t.status === 'executing').length
    const completed = recentTasks.filter(t => t.status === 'completed').length
    const failed = recentTasks.filter(t => t.status === 'failed').length
    return { all, executing, completed, failed }
  }, [recentTasks])

  // Filtered + searched tasks
  const filteredTasks = useMemo(() => {
    let tasks = recentTasks
    if (activeFilter !== 'all') {
      tasks = tasks.filter(t => t.status === activeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      tasks = tasks.filter(t =>
        t.repo_name.toLowerCase().includes(q) ||
        t.base_branch.toLowerCase().includes(q) ||
        t.head_branch.toLowerCase().includes(q)
      )
    }
    return tasks
  }, [recentTasks, activeFilter, searchQuery])

  const statusIcon = (status: string, size = 'w-4 h-4') => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className={`${size} flex-shrink-0`} style={{ color: 'var(--mars-color-success)' }} />
      case 'failed':
        return <XCircle className={`${size} flex-shrink-0`} style={{ color: 'var(--mars-color-danger)' }} />
      case 'executing':
        return <Loader2 className={`${size} flex-shrink-0 animate-spin`} style={{ color: '#f59e0b' }} />
      default:
        return <AlertCircle className={`${size} flex-shrink-0`} style={{ color: 'var(--mars-color-text-tertiary)' }} />
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--mars-color-success)'
      case 'failed': return 'var(--mars-color-danger)'
      case 'executing': return '#f59e0b'
      default: return 'var(--mars-color-text-tertiary)'
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `about ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `about ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--mars-color-bg)' }}>
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-5 h-14 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--mars-color-border)' }}
      >
        <div className="flex items-center gap-3">
          {/* App icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--mars-color-primary)' }}
          >
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight" style={{ color: 'var(--mars-color-text)' }}>
              MARS - Release Notes
            </h1>
            <p className="text-[11px] leading-tight" style={{ color: 'var(--mars-color-text-tertiary)' }}>
              AI-Powered Release Notes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{ backgroundColor: 'var(--mars-color-primary)', color: 'white' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            + New Task
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Main content area ── */}
        <main className="flex-1 overflow-y-auto">
          {showTask ? (
            <ReleaseNotesTask
              key={taskKey}
              onBack={handleBackToHome}
              resumeTaskId={selectedTaskId}
            />
          ) : (
            /* ── Landing / Hero ── */
            <div className="flex flex-col items-center justify-center h-full px-6">
              {/* Hero icon */}
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(135deg, var(--mars-color-primary), #818cf8)',
                  boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
                }}
              >
                <Sparkles className="w-12 h-12 text-white" />
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--mars-color-text)' }}>
                Release Notes Generator
              </h2>
              <p className="text-sm mb-8 max-w-lg text-center" style={{ color: 'var(--mars-color-text-secondary)' }}>
                Generate release notes through AI-powered interactive stages with context carryover
              </p>

              {/* CTA */}
              <button
                onClick={handleNewTask}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all mb-10"
                style={{
                  background: 'linear-gradient(135deg, var(--mars-color-primary), #818cf8)',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                }}
              >
                <FileText className="w-4 h-4" />
                Create New Task
              </button>

              {/* Feature cards */}
              <div className="flex gap-4">
                <div
                  className="w-44 p-5 rounded-xl border text-center"
                  style={{ borderColor: 'var(--mars-color-border)', backgroundColor: 'var(--mars-color-surface)' }}
                >
                  <GitCompare className="w-7 h-7 mx-auto mb-3" style={{ color: 'var(--mars-color-text-secondary)' }} />
                  <div className="text-sm font-semibold mb-1" style={{ color: 'var(--mars-color-text)' }}>Git Diff</div>
                  <div className="text-[11px]" style={{ color: 'var(--mars-color-text-tertiary)' }}>Clone & compare branches</div>
                </div>
                <div
                  className="w-44 p-5 rounded-xl border text-center"
                  style={{ borderColor: 'var(--mars-color-border)', backgroundColor: 'var(--mars-color-surface)' }}
                >
                  <Sparkles className="w-7 h-7 mx-auto mb-3" style={{ color: 'var(--mars-color-text-secondary)' }} />
                  <div className="text-sm font-semibold mb-1" style={{ color: 'var(--mars-color-text)' }}>AI Stages</div>
                  <div className="text-[11px]" style={{ color: 'var(--mars-color-text-tertiary)' }}>5-stage pipeline</div>
                </div>
                <div
                  className="w-44 p-5 rounded-xl border text-center"
                  style={{ borderColor: 'var(--mars-color-border)', backgroundColor: 'var(--mars-color-surface)' }}
                >
                  <Download className="w-7 h-7 mx-auto mb-3" style={{ color: 'var(--mars-color-text-secondary)' }} />
                  <div className="text-sm font-semibold mb-1" style={{ color: 'var(--mars-color-text)' }}>PDF Export</div>
                  <div className="text-[11px]" style={{ color: 'var(--mars-color-text-tertiary)' }}>Download ready</div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ── Right sidebar: SESSIONS ── */}
        <aside
          className="w-80 flex-shrink-0 flex flex-col overflow-hidden"
          style={{
            borderLeft: '1px solid var(--mars-color-border)',
            backgroundColor: 'var(--mars-color-surface)',
          }}
        >
          {/* Sidebar header */}
          <div className="px-4 pt-4 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--mars-color-text-secondary)' }}>
              Sessions
            </h2>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--mars-color-text-tertiary)' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search sessions..."
                className="w-full h-8 pl-8 pr-3 rounded-md text-xs outline-none border"
                style={{
                  backgroundColor: 'var(--mars-color-bg)',
                  borderColor: 'var(--mars-color-border)',
                  color: 'var(--mars-color-text)',
                }}
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div
            className="flex px-4 pb-2 gap-1"
            style={{ borderBottom: '1px solid var(--mars-color-border)' }}
          >
            {([
              { key: 'all' as FilterTab, label: 'All', count: counts.all },
              { key: 'executing' as FilterTab, label: 'Running', count: counts.executing },
              { key: 'completed' as FilterTab, label: 'Completed', count: counts.completed },
              { key: 'failed' as FilterTab, label: 'Failed', count: counts.failed },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: activeFilter === tab.key ? 'var(--mars-color-primary-subtle)' : 'transparent',
                  color: activeFilter === tab.key ? 'var(--mars-color-primary)' : 'var(--mars-color-text-tertiary)',
                  border: activeFilter === tab.key ? '1px solid var(--mars-color-primary)' : '1px solid transparent',
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 opacity-70">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--mars-color-text-tertiary)' }} />
                <p className="text-xs" style={{ color: 'var(--mars-color-text-tertiary)' }}>
                  {searchQuery ? 'No matching tasks' : 'No tasks yet'}
                </p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <button
                  key={task.task_id}
                  onClick={() => handleSelectTask(task.task_id)}
                  className="group w-full text-left px-4 py-3.5 transition-colors"
                  style={{
                    borderBottom: '1px solid var(--mars-color-border)',
                    backgroundColor:
                      selectedTaskId === task.task_id
                        ? 'var(--mars-color-bg-hover)'
                        : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (selectedTaskId !== task.task_id)
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--mars-color-bg-hover)'
                  }}
                  onMouseLeave={e => {
                    if (selectedTaskId !== task.task_id)
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        selectedTaskId === task.task_id ? 'var(--mars-color-bg-hover)' : 'transparent'
                  }}
                >
                  {/* Row 1: status icon + repo name + delete */}
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">{statusIcon(task.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--mars-color-text)' }}>
                          {task.repo_name}: {task.base_branch} → {task.head_branch}
                        </div>
                        <button
                          onClick={(e) => handleDeleteTask(e, task.task_id)}
                          className="p-1 rounded-md flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--mars-color-danger-subtle)]"
                          style={{ color: 'var(--mars-color-danger)' }}
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--mars-color-text-tertiary)' }}>
                        {task.current_stage ? `Stage ${task.current_stage}: ${STAGE_LABELS[task.current_stage] || ''}` : 'Setup'}
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--mars-color-border)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${task.progress_percent}%`,
                              backgroundColor: statusColor(task.status),
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-medium w-8 text-right" style={{ color: 'var(--mars-color-text-tertiary)' }}>
                          {Math.round(task.progress_percent)}%
                        </span>
                      </div>

                      {/* Time */}
                      <div className="text-[10px] mt-1" style={{ color: 'var(--mars-color-text-tertiary)' }}>
                        {formatDate(task.created_at)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
