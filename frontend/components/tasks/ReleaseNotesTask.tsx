'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  GitBranch,
  Loader2,
  Play,
  Eye,
  Edit3,
  Save,
  Send,
  Check,
  Key,
  Upload,
  Download,
  Database,
  FileText,
  Package,
  DollarSign,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/core'
import Stepper from '@/components/core/Stepper'
import type { StepperStep } from '@/components/core/Stepper'
import ExecutionProgress from '@/components/deepresearch/ExecutionProgress'
import MarkdownRenderer from '@/components/files/MarkdownRenderer'
import { useReleaseNotesTask } from '@/hooks/useReleaseNotesTask'
import { getApiUrl } from '@/lib/config'
import {
  RELEASE_NOTES_STEP_LABELS,
  WIZARD_STEP_TO_STAGE,
  STAGE_SHARED_KEYS,
  ANALYSIS_DOC_KEYS,
  RELEASE_NOTES_DOC_KEYS,
} from '@/types/releasenotes'
import type { ReleaseNotesWizardStep, RefinementMessage, AnalysisDocKey, ReleaseNotesDocKey } from '@/types/releasenotes'

// ─── Props ──────────────────────────────────────────────────────────────

interface ReleaseNotesTaskProps {
  onBack: () => void
  resumeTaskId?: string | null
}

// ─── Component ──────────────────────────────────────────────────────────

export default function ReleaseNotesTask({ onBack, resumeTaskId }: ReleaseNotesTaskProps) {
  const hook = useReleaseNotesTask()
  const {
    taskId,
    taskState,
    currentStep,
    isLoading,
    error,
    isExecuting,
    editableContent,
    setEditableContent,
    refinementMessages,
    consoleOutput,
    setCurrentStep,
    createTask,
    executeStage,
    fetchStageContent,
    saveStageContent,
    refineContent,
    resumeTask,
    clearError,
  } = hook

  // ── Form state (Setup) ──
  const [repoUrl, setRepoUrl] = useState('')
  const [baseBranch, setBaseBranch] = useState('')
  const [headBranch, setHeadBranch] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [extraInstructions, setExtraInstructions] = useState('')

  // ── Migration config (Step 4) ── (auto-executes)

  const isFormValid = useMemo(() => {
    return (
      repoUrl.trim().startsWith('https://') &&
      baseBranch.trim().length > 0 &&
      headBranch.trim().length > 0 &&
      baseBranch.trim() !== headBranch.trim()
    )
  }, [repoUrl, baseBranch, headBranch])

  // Resume on mount if resumeTaskId provided
  useEffect(() => {
    if (resumeTaskId) {
      resumeTask(resumeTaskId)
    }
  }, [resumeTaskId, resumeTask])

  // Build stepper steps from taskState
  const stepperSteps: StepperStep[] = RELEASE_NOTES_STEP_LABELS.map((label, idx) => {
    const stageNum = WIZARD_STEP_TO_STAGE[idx]
    let status: StepperStep['status'] = 'pending'

    if (idx === currentStep) {
      status = 'active'
    } else if (idx < currentStep) {
      status = 'completed'
    }

    if (taskState && stageNum) {
      const stage = taskState.stages.find(s => s.stage_number === stageNum)
      if (stage) {
        if (stage.status === 'completed') status = 'completed'
        else if (stage.status === 'failed') status = 'failed'
        else if (stage.status === 'running') status = 'active'
      }
    }

    if (idx === 0 && taskId) {
      status = 'completed'
    }

    return { id: `step-${idx}`, label, status }
  })

  const goNext = useCallback(() => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as ReleaseNotesWizardStep)
    }
  }, [currentStep, setCurrentStep])

  const goBack = useCallback(() => {
    if (currentStep > 0 && !isExecuting) {
      setCurrentStep((currentStep - 1) as ReleaseNotesWizardStep)
    }
  }, [currentStep, isExecuting, setCurrentStep])

  // ── Setup panel ───────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    const id = await createTask(
      repoUrl.trim(),
      baseBranch.trim(),
      headBranch.trim(),
      authToken.trim() || undefined,
      extraInstructions.trim() || undefined,
    )
    if (id) goNext()
  }, [createTask, repoUrl, baseBranch, headBranch, authToken, extraInstructions, goNext])

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg transition-colors hover:bg-[var(--mars-color-surface-overlay)]"
          style={{ color: 'var(--mars-color-text-secondary)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2
            className="text-xl font-semibold"
            style={{ color: 'var(--mars-color-text)' }}
          >
            {taskId ? 'Release Notes Task' : 'New Task'}
          </h2>
          <p
            className="text-sm mt-0.5"
            style={{ color: 'var(--mars-color-text-secondary)' }}
          >
            Generate release notes through interactive stages with context carryover
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-4 p-3 rounded-mars-md flex items-center justify-between text-sm"
          style={{
            backgroundColor: 'var(--mars-color-danger-subtle)',
            color: 'var(--mars-color-danger)',
            border: '1px solid var(--mars-color-danger)',
          }}
        >
          <span>{error}</span>
          <button onClick={clearError} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Stepper */}
      <div className="mb-8">
        <Stepper steps={stepperSteps} orientation="horizontal" size="sm" />
      </div>

      {/* Panel content */}
      <div>
        {/* Step 0: Setup */}
        {currentStep === 0 && (
          <SetupPanel
            repoUrl={repoUrl} setRepoUrl={setRepoUrl}
            baseBranch={baseBranch} setBaseBranch={setBaseBranch}
            headBranch={headBranch} setHeadBranch={setHeadBranch}
            authToken={authToken} setAuthToken={setAuthToken}
            extraInstructions={extraInstructions} setExtraInstructions={setExtraInstructions}
            isFormValid={isFormValid}
            isLoading={isLoading}
            onCreate={handleCreate}
          />
        )}

        {/* Step 1: Clone & Diff (execution panel) */}
        {currentStep === 1 && (
          <ExecutionStagePanel
            hook={hook}
            stageNum={1}
            stageName="Clone & Diff"
            description="Clone the repository and generate diffs between branches."
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {/* Step 2: AI Analysis (3-document tabbed panel) */}
        {currentStep === 2 && (
          <AnalysisStagePanel
            hook={hook}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {/* Step 3: Release Notes (2-document tabbed panel) */}
        {currentStep === 3 && (
          <ReleaseNotesStagePanel
            hook={hook}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {/* Step 4: Migration (auto-executes, then shows generated scripts) */}
        {currentStep === 4 && (
          <MigrationPanel
            hook={hook}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {/* Step 5: Package */}
        {currentStep === 5 && (
          <PackagePanel
            hook={hook}
            onBack={goBack}
          />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Setup Panel
// ═══════════════════════════════════════════════════════════════════════

interface SetupPanelProps {
  repoUrl: string; setRepoUrl: (v: string) => void
  baseBranch: string; setBaseBranch: (v: string) => void
  headBranch: string; setHeadBranch: (v: string) => void
  authToken: string; setAuthToken: (v: string) => void
  extraInstructions: string; setExtraInstructions: (v: string) => void
  isFormValid: boolean
  isLoading: boolean
  onCreate: () => void
}

function SetupPanel({
  repoUrl, setRepoUrl,
  baseBranch, setBaseBranch,
  headBranch, setHeadBranch,
  authToken, setAuthToken,
  extraInstructions, setExtraInstructions,
  isFormValid, isLoading, onCreate,
}: SetupPanelProps) {
  return (
    <div className="max-w-full mx-auto space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--mars-color-text)' }}>
          GitHub Repository URL
        </label>
        <input
          type="url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="w-full h-10 px-3 rounded-mars-md border text-sm outline-none focus:border-[var(--mars-color-primary)]"
          style={{ backgroundColor: 'var(--mars-color-surface)', borderColor: 'var(--mars-color-border)', color: 'var(--mars-color-text)' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--mars-color-text)' }}>
            Last Release Branch (base)
          </label>
          <input
            type="text" value={baseBranch} onChange={(e) => setBaseBranch(e.target.value)}
            placeholder="e.g. release/v1.0"
            className="w-full h-10 px-3 rounded-mars-md border text-sm outline-none focus:border-[var(--mars-color-primary)]"
            style={{ backgroundColor: 'var(--mars-color-surface)', borderColor: 'var(--mars-color-border)', color: 'var(--mars-color-text)' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--mars-color-text)' }}>
            Current Release Branch (head)
          </label>
          <input
            type="text" value={headBranch} onChange={(e) => setHeadBranch(e.target.value)}
            placeholder="e.g. release/v2.0"
            className="w-full h-10 px-3 rounded-mars-md border text-sm outline-none focus:border-[var(--mars-color-primary)]"
            style={{ backgroundColor: 'var(--mars-color-surface)', borderColor: 'var(--mars-color-border)', color: 'var(--mars-color-text)' }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--mars-color-text)' }}>
          Auth Token <span style={{ color: 'var(--mars-color-text-tertiary)' }}>(optional — for private repos)</span>
        </label>
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--mars-color-text-tertiary)' }} />
          <input
            type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)}
            placeholder="ghp_..."
            className="w-full h-10 pl-9 pr-3 rounded-mars-md border text-sm outline-none focus:border-[var(--mars-color-primary)]"
            style={{ backgroundColor: 'var(--mars-color-surface)', borderColor: 'var(--mars-color-border)', color: 'var(--mars-color-text)' }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--mars-color-text)' }}>
          Additional Instructions <span style={{ color: 'var(--mars-color-text-tertiary)' }}>(optional)</span>
        </label>
        <textarea
          value={extraInstructions} onChange={(e) => setExtraInstructions(e.target.value)}
          placeholder="e.g. Focus on API changes, highlight breaking changes..."
          rows={3}
          className="w-full px-3 py-2 rounded-mars-md border text-sm outline-none focus:border-[var(--mars-color-primary)] resize-none"
          style={{ backgroundColor: 'var(--mars-color-surface)', borderColor: 'var(--mars-color-border)', color: 'var(--mars-color-text)' }}
        />
      </div>

      {/* Branch visual */}
      <div
        className="flex items-center justify-center gap-3 p-4 rounded-mars-md border"
        style={{ backgroundColor: 'var(--mars-color-surface)', borderColor: 'var(--mars-color-border)' }}
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'var(--mars-color-surface-overlay)', color: 'var(--mars-color-text-secondary)' }}>
            <GitBranch className="w-3 h-3" />{baseBranch || 'base'}
          </div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--mars-color-text-tertiary)' }}>Previous</p>
        </div>
        <div className="flex items-center gap-1" style={{ color: 'var(--mars-color-text-tertiary)' }}>
          <div className="w-8 h-px" style={{ backgroundColor: 'var(--mars-color-border)' }} />
          <span className="text-xs">&rarr;</span>
          <div className="w-8 h-px" style={{ backgroundColor: 'var(--mars-color-border)' }} />
        </div>
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
            <GitBranch className="w-3 h-3" />{headBranch || 'head'}
          </div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--mars-color-text-tertiary)' }}>Current</p>
        </div>
      </div>

      <Button
        onClick={onCreate}
        disabled={!isFormValid || isLoading}
        className="w-full"
        variant="primary"
        size="lg"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Creating task...</span>
        ) : (
          <span className="flex items-center justify-center gap-2"><Play className="w-4 h-4" />Create Task & Continue</span>
        )}
      </Button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Execution Stage Panel (for Clone & Diff and Package stages)
// ═══════════════════════════════════════════════════════════════════════

interface ExecutionStagePanelProps {
  hook: ReturnType<typeof useReleaseNotesTask>
  stageNum: number
  stageName: string
  description: string
  onNext?: () => void
  onBack: () => void
}

function ExecutionStagePanel({ hook, stageNum, stageName, description, onNext, onBack }: ExecutionStagePanelProps) {
  const { taskState, consoleOutput, isExecuting, executeStage } = hook

  const stage = taskState?.stages.find(s => s.stage_number === stageNum)
  const isCompleted = stage?.status === 'completed'
  const isFailed = stage?.status === 'failed'
  const isNotStarted = stage?.status === 'pending'

  if (isNotStarted && !isExecuting) {
    return (
      <div className="max-w-full mx-auto space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--mars-color-text)' }}>
            {stageName}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--mars-color-text-secondary)' }}>{description}</p>
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={onBack} variant="secondary" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          <Button onClick={() => executeStage(stageNum)} variant="primary" size="sm">
            <Play className="w-3.5 h-3.5 mr-1" /> Run {stageName}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto space-y-4">
      <ExecutionProgress
        consoleOutput={consoleOutput}
        isExecuting={isExecuting}
        stageName={stageName}
      />

      {(isCompleted || isFailed) && (
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={onBack} variant="secondary" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          {onNext && isCompleted && (
            <Button onClick={onNext} variant="primary" size="sm">
              Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
          {isFailed && (
            <Button onClick={() => executeStage(stageNum)} variant="secondary" size="sm">
              <Play className="w-3.5 h-3.5 mr-1" /> Retry
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Analysis Stage Panel (3-document tabbed view with download)
// ═══════════════════════════════════════════════════════════════════════

interface AnalysisStagePanelProps {
  hook: ReturnType<typeof useReleaseNotesTask>
  onNext: () => void
  onBack: () => void
}

function AnalysisStagePanel({ hook, onNext, onBack }: AnalysisStagePanelProps) {
  const {
    taskId,
    taskState,
    stageDocuments,
    editableContent,
    setEditableContent,
    setStageDocuments,
    refinementMessages,
    consoleOutput,
    isExecuting,
    executeStage,
    fetchStageContent,
    saveStageContent,
    refineContent,
  } = hook

  const [activeTab, setActiveTab] = useState<AnalysisDocKey>('analysis_base')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [isSaving, setIsSaving] = useState(false)
  const [saveIndicator, setSaveIndicator] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [contentLoaded, setContentLoaded] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stage = taskState?.stages.find(s => s.stage_number === 2)
  const isStageCompleted = stage?.status === 'completed'
  const isStageRunning = stage?.status === 'running' || isExecuting
  const isStageNotStarted = stage?.status === 'pending'
  const isStageFailed = stage?.status === 'failed'

  useEffect(() => {
    if ((isStageCompleted || isStageFailed) && !contentLoaded) {
      fetchStageContent(2).then(() => setContentLoaded(true))
    }
  }, [isStageCompleted, isStageFailed, contentLoaded, fetchStageContent])

  // When tab changes, switch the editable content to the selected doc
  useEffect(() => {
    if (stageDocuments && stageDocuments[activeTab] !== undefined) {
      setEditableContent(stageDocuments[activeTab])
    }
  }, [activeTab, stageDocuments, setEditableContent])

  const hasContent = contentLoaded && (stageDocuments !== null)

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveIndicator('saving')
    // Save the current tab content back to stageDocuments and to backend
    if (stageDocuments) {
      setStageDocuments({ ...stageDocuments, [activeTab]: editableContent })
    }
    await saveStageContent(2, editableContent, activeTab)
    setIsSaving(false)
    setSaveIndicator('saved')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => setSaveIndicator('idle'), 2000)
  }, [editableContent, activeTab, stageDocuments, saveStageContent, setStageDocuments])

  const handleRefine = useCallback(async (message: string): Promise<string | null> => {
    const result = await refineContent(2, message, editableContent)
    return result
  }, [editableContent, refineContent])

  const handleApplyRefinement = useCallback((content: string) => {
    if (!content || !content.trim()) return
    setEditableContent(content)
    if (stageDocuments) {
      setStageDocuments({ ...stageDocuments, [activeTab]: content })
    }
  }, [setEditableContent, stageDocuments, activeTab, setStageDocuments])

  const handleDownload = useCallback((docKey: string) => {
    if (!taskId) return
    const url = getApiUrl(`/api/release-notes/${taskId}/stages/2/download?doc_key=${docKey}`)
    window.open(url, '_blank')
  }, [taskId])

  const handleDownloadAll = useCallback(() => {
    if (!taskId) return
    ANALYSIS_DOC_KEYS.forEach(({ key }) => {
      const url = getApiUrl(`/api/release-notes/${taskId}/stages/2/download?doc_key=${key}`)
      const link = document.createElement('a')
      link.href = url
      link.download = ''
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    })
  }, [taskId])

  // Pre-execution state
  if (isStageNotStarted && !isExecuting) {
    return (
      <div className="max-w-full mx-auto space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--mars-color-text)' }}>
            AI Analysis
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--mars-color-text-secondary)' }}>
          Run the AI agent to produce 3 analysis documents: a summary of the last release branch,
          a summary of the current release branch, and a detailed comparison between the two.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={onBack} variant="secondary" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          <Button onClick={() => executeStage(2)} variant="primary" size="sm">
            <Play className="w-3.5 h-3.5 mr-1" /> Run Analysis
          </Button>
        </div>
      </div>
    )
  }

  // Running state
  if (isStageRunning && !hasContent) {
    return (
      <div className="max-w-full mx-auto space-y-4">
        <ExecutionProgress
          consoleOutput={consoleOutput}
          isExecuting={true}
          stageName="AI Analysis"
        />
      </div>
    )
  }

  const activeDocInfo = ANALYSIS_DOC_KEYS.find(d => d.key === activeTab)

  // Content view — 3 tabs
  return (
    <div className="max-w-full mx-auto space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--mars-color-text)' }}>
            AI Analysis
          </span>
          {saveIndicator === 'saving' && (
            <span className="text-xs" style={{ color: 'var(--mars-color-text-tertiary)' }}>Saving...</span>
          )}
          {saveIndicator === 'saved' && (
            <span className="text-xs" style={{ color: 'var(--mars-color-accent)' }}>Saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleDownloadAll} variant="secondary" size="sm">
            <Download className="w-3.5 h-3.5 mr-1" /> Download All
          </Button>
          <Button
            onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
            variant="secondary"
            size="sm"
          >
            {mode === 'edit' ? <Eye className="w-3.5 h-3.5 mr-1" /> : <Edit3 className="w-3.5 h-3.5 mr-1" />}
            {mode === 'edit' ? 'Preview' : 'Edit'}
          </Button>
          <Button onClick={handleSave} variant="secondary" size="sm" disabled={isSaving}>
            <Save className="w-3.5 h-3.5 mr-1" /> Save
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: 'var(--mars-color-border)' }}
      >
        {ANALYSIS_DOC_KEYS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as AnalysisDocKey)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{
              color: activeTab === key ? 'var(--mars-color-accent)' : 'var(--mars-color-text-secondary)',
              borderBottom: activeTab === key ? '2px solid var(--mars-color-accent)' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-4" style={{ minHeight: 400 }}>
        {/* Editor / Preview */}
        <div
          className="flex-1 rounded-mars-md border overflow-auto"
          style={{ borderColor: 'var(--mars-color-border)' }}
        >
          {mode === 'edit' ? (
            <textarea
              value={editableContent}
              onChange={(e) => setEditableContent(e.target.value)}
              className="w-full h-full min-h-[400px] p-4 text-sm font-mono resize-none outline-none"
              style={{
                backgroundColor: 'var(--mars-color-surface)',
                color: 'var(--mars-color-text)',
              }}
            />
          ) : (
            <div className="p-4">
              <MarkdownRenderer content={editableContent || ''} />
            </div>
          )}
        </div>

        {/* Right sidebar: download + refinement */}
        <div
          className="w-72 flex-shrink-0 rounded-mars-md border flex flex-col"
          style={{ borderColor: 'var(--mars-color-border)', backgroundColor: 'var(--mars-color-surface)', maxHeight: 420 }}
        >
          {/* Download for current tab */}
          <div
            className="px-3 py-2 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--mars-color-border)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--mars-color-text-secondary)' }}>
              {activeDocInfo?.label}
            </span>
            <Button
              onClick={() => handleDownload(activeTab)}
              variant="secondary"
              size="sm"
            >
              <Download className="w-3 h-3 mr-1" /> Download
            </Button>
          </div>

          <div
            className="px-3 py-2 text-xs font-medium border-b"
            style={{ color: 'var(--mars-color-text-secondary)', borderColor: 'var(--mars-color-border)' }}
          >
            AI Refinement
          </div>
          <InlineRefinementChat
            messages={refinementMessages}
            onSend={handleRefine}
            onApply={handleApplyRefinement}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={onBack} variant="secondary" size="sm">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
        </Button>
        <Button onClick={onNext} variant="primary" size="sm">
          Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Review Stage Panel (for Release Notes stage)
// ═══════════════════════════════════════════════════════════════════════

interface ReviewStagePanelProps {
  hook: ReturnType<typeof useReleaseNotesTask>
  stageNum: number
  stageName: string
  sharedKey: string
  onNext: () => void
  onBack: () => void
}

function ReviewStagePanel({ hook, stageNum, stageName, sharedKey, onNext, onBack }: ReviewStagePanelProps) {
  const {
    taskId,
    taskState,
    editableContent,
    setEditableContent,
    refinementMessages,
    consoleOutput,
    isExecuting,
    executeStage,
    fetchStageContent,
    saveStageContent,
    refineContent,
  } = hook

  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [isSaving, setIsSaving] = useState(false)
  const [saveIndicator, setSaveIndicator] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [contentLoaded, setContentLoaded] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stage = taskState?.stages.find(s => s.stage_number === stageNum)
  const isStageCompleted = stage?.status === 'completed'
  const isStageRunning = stage?.status === 'running' || isExecuting
  const isStageNotStarted = stage?.status === 'pending'
  const isStageFailed = stage?.status === 'failed'

  useEffect(() => {
    if ((isStageCompleted || isStageFailed) && !contentLoaded) {
      fetchStageContent(stageNum).then(() => setContentLoaded(true))
    }
  }, [isStageCompleted, isStageFailed, contentLoaded, fetchStageContent, stageNum])

  // Content is available only when we've loaded it for THIS stage
  const hasContent = contentLoaded && (editableContent?.length > 0)

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveIndicator('saving')
    await saveStageContent(stageNum, editableContent, sharedKey)
    setIsSaving(false)
    setSaveIndicator('saved')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => setSaveIndicator('idle'), 2000)
  }, [stageNum, editableContent, sharedKey, saveStageContent])

  const handleRefine = useCallback(async (message: string): Promise<string | null> => {
    const result = await refineContent(stageNum, message, editableContent)
    return result
  }, [stageNum, editableContent, refineContent])

  const handleApplyRefinement = useCallback((content: string) => {
    if (content && content.trim()) {
      setEditableContent(content)
    }
  }, [setEditableContent])

  // Pre-execution state
  if (isStageNotStarted && !isExecuting) {
    return (
      <div className="max-w-full mx-auto space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--mars-color-text)' }}>
            {stageName}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--mars-color-text-secondary)' }}>
          Run the AI agent to generate {stageName.toLowerCase()} content with full context from prior stages.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={onBack} variant="secondary" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          <Button onClick={() => executeStage(stageNum)} variant="primary" size="sm">
            <Play className="w-3.5 h-3.5 mr-1" /> Run {stageName}
          </Button>
        </div>
      </div>
    )
  }

  // Running state
  if (isStageRunning && !hasContent) {
    return (
      <div className="max-w-full mx-auto space-y-4">
        <ExecutionProgress
          consoleOutput={consoleOutput}
          isExecuting={true}
          stageName={stageName}
        />
      </div>
    )
  }

  // Content view (completed or failed with content)
  return (
    <div className="max-w-full mx-auto space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--mars-color-text)' }}>
            {stageName}
          </span>
          {saveIndicator === 'saving' && (
            <span className="text-xs" style={{ color: 'var(--mars-color-text-tertiary)' }}>Saving...</span>
          )}
          {saveIndicator === 'saved' && (
            <span className="text-xs" style={{ color: 'var(--mars-color-accent)' }}>Saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {taskId && (
            <Button
              onClick={() => {
                const url = getApiUrl(`/api/release-notes/${taskId}/stages/${stageNum}/download-pdf`)
                window.open(url, '_blank')
              }}
              variant="secondary"
              size="sm"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              PDF
            </Button>
          )}
          <Button
            onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
            variant="secondary"
            size="sm"
          >
            {mode === 'edit' ? <Eye className="w-3.5 h-3.5 mr-1" /> : <Edit3 className="w-3.5 h-3.5 mr-1" />}
            {mode === 'edit' ? 'Preview' : 'Edit'}
          </Button>
          <Button onClick={handleSave} variant="secondary" size="sm" disabled={isSaving}>
            <Save className="w-3.5 h-3.5 mr-1" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex gap-4" style={{ minHeight: 400 }}>
        {/* Editor / Preview */}
        <div
          className="flex-1 rounded-mars-md border overflow-auto"
          style={{ borderColor: 'var(--mars-color-border)' }}
        >
          {mode === 'edit' ? (
            <textarea
              value={editableContent}
              onChange={(e) => setEditableContent(e.target.value)}
              className="w-full h-full min-h-[400px] p-4 text-sm font-mono resize-none outline-none"
              style={{
                backgroundColor: 'var(--mars-color-surface)',
                color: 'var(--mars-color-text)',
              }}
            />
          ) : (
            <div className="p-4">
              <MarkdownRenderer content={editableContent || ''} />
            </div>
          )}
        </div>

        {/* Refinement Chat */}
        <div
          className="w-72 flex-shrink-0 rounded-mars-md border flex flex-col"
          style={{ borderColor: 'var(--mars-color-border)', backgroundColor: 'var(--mars-color-surface)', maxHeight: 420 }}
        >
          <div
            className="px-3 py-2 text-xs font-medium border-b"
            style={{ color: 'var(--mars-color-text-secondary)', borderColor: 'var(--mars-color-border)' }}
          >
            AI Refinement
          </div>
          <InlineRefinementChat
            messages={refinementMessages}
            onSend={handleRefine}
            onApply={handleApplyRefinement}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={onBack} variant="secondary" size="sm">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
        </Button>
        <Button onClick={onNext} variant="primary" size="sm">
          Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Release Notes Stage Panel (2-document tabbed view: Commercial + Developer)
// ═══════════════════════════════════════════════════════════════════════

interface ReleaseNotesStagePanelProps {
  hook: ReturnType<typeof useReleaseNotesTask>
  onNext: () => void
  onBack: () => void
}

function ReleaseNotesStagePanel({ hook, onNext, onBack }: ReleaseNotesStagePanelProps) {
  const {
    taskId,
    taskState,
    stageDocuments,
    editableContent,
    setEditableContent,
    setStageDocuments,
    refinementMessages,
    consoleOutput,
    isExecuting,
    executeStage,
    fetchStageContent,
    saveStageContent,
    refineContent,
  } = hook

  const [activeTab, setActiveTab] = useState<ReleaseNotesDocKey>('release_notes_commercial')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [isSaving, setIsSaving] = useState(false)
  const [saveIndicator, setSaveIndicator] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [contentLoaded, setContentLoaded] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stage = taskState?.stages.find(s => s.stage_number === 3)
  const isStageCompleted = stage?.status === 'completed'
  const isStageRunning = stage?.status === 'running' || isExecuting
  const isStageNotStarted = stage?.status === 'pending'
  const isStageFailed = stage?.status === 'failed'

  useEffect(() => {
    if ((isStageCompleted || isStageFailed) && !contentLoaded) {
      fetchStageContent(3).then(() => setContentLoaded(true))
    }
  }, [isStageCompleted, isStageFailed, contentLoaded, fetchStageContent])

  // When tab changes, switch the editable content to the selected doc
  useEffect(() => {
    if (stageDocuments && stageDocuments[activeTab] !== undefined) {
      setEditableContent(stageDocuments[activeTab])
    }
  }, [activeTab, stageDocuments, setEditableContent])

  const hasContent = contentLoaded && (stageDocuments !== null)

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveIndicator('saving')
    if (stageDocuments) {
      setStageDocuments({ ...stageDocuments, [activeTab]: editableContent })
    }
    await saveStageContent(3, editableContent, activeTab)
    setIsSaving(false)
    setSaveIndicator('saved')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => setSaveIndicator('idle'), 2000)
  }, [editableContent, activeTab, stageDocuments, saveStageContent, setStageDocuments])

  const handleRefine = useCallback(async (message: string): Promise<string | null> => {
    const result = await refineContent(3, message, editableContent)
    return result
  }, [editableContent, refineContent])

  const handleApplyRefinement = useCallback((content: string) => {
    if (!content || !content.trim()) return
    setEditableContent(content)
    if (stageDocuments) {
      setStageDocuments({ ...stageDocuments, [activeTab]: content })
    }
  }, [setEditableContent, stageDocuments, activeTab, setStageDocuments])

  const handleDownload = useCallback((docKey: string) => {
    if (!taskId) return
    const url = getApiUrl(`/api/release-notes/${taskId}/stages/3/download?doc_key=${docKey}`)
    window.open(url, '_blank')
  }, [taskId])

  const handleDownloadAll = useCallback(() => {
    if (!taskId) return
    RELEASE_NOTES_DOC_KEYS.forEach(({ key }) => {
      const url = getApiUrl(`/api/release-notes/${taskId}/stages/3/download?doc_key=${key}`)
      const link = document.createElement('a')
      link.href = url
      link.download = ''
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    })
  }, [taskId])

  // Pre-execution state
  if (isStageNotStarted && !isExecuting) {
    return (
      <div className="max-w-full mx-auto space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--mars-color-text)' }}>
            Release Notes
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--mars-color-text-secondary)' }}>
          Run the AI agent to produce 2 release notes documents: Commercial Release Notes for
          end-users and Developer Release Notes for engineering teams.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={onBack} variant="secondary" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          <Button onClick={() => executeStage(3)} variant="primary" size="sm">
            <Play className="w-3.5 h-3.5 mr-1" /> Run Release Notes
          </Button>
        </div>
      </div>
    )
  }

  // Running state
  if (isStageRunning && !hasContent) {
    return (
      <div className="max-w-full mx-auto space-y-4">
        <ExecutionProgress
          consoleOutput={consoleOutput}
          isExecuting={true}
          stageName="Release Notes"
        />
      </div>
    )
  }

  const activeDocInfo = RELEASE_NOTES_DOC_KEYS.find(d => d.key === activeTab)

  // Content view — 2 tabs
  return (
    <div className="max-w-full mx-auto space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--mars-color-text)' }}>
            Release Notes
          </span>
          {saveIndicator === 'saving' && (
            <span className="text-xs" style={{ color: 'var(--mars-color-text-tertiary)' }}>Saving...</span>
          )}
          {saveIndicator === 'saved' && (
            <span className="text-xs" style={{ color: 'var(--mars-color-accent)' }}>Saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleDownloadAll} variant="secondary" size="sm">
            <Download className="w-3.5 h-3.5 mr-1" /> Download All
          </Button>
          <Button
            onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
            variant="secondary"
            size="sm"
          >
            {mode === 'edit' ? <Eye className="w-3.5 h-3.5 mr-1" /> : <Edit3 className="w-3.5 h-3.5 mr-1" />}
            {mode === 'edit' ? 'Preview' : 'Edit'}
          </Button>
          <Button onClick={handleSave} variant="secondary" size="sm" disabled={isSaving}>
            <Save className="w-3.5 h-3.5 mr-1" /> Save
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: 'var(--mars-color-border)' }}
      >
        {RELEASE_NOTES_DOC_KEYS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as ReleaseNotesDocKey)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{
              color: activeTab === key ? 'var(--mars-color-accent)' : 'var(--mars-color-text-secondary)',
              borderBottom: activeTab === key ? '2px solid var(--mars-color-accent)' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-4" style={{ minHeight: 400 }}>
        {/* Editor / Preview */}
        <div
          className="flex-1 rounded-mars-md border overflow-auto"
          style={{ borderColor: 'var(--mars-color-border)' }}
        >
          {mode === 'edit' ? (
            <textarea
              value={editableContent}
              onChange={(e) => setEditableContent(e.target.value)}
              className="w-full h-full min-h-[400px] p-4 text-sm font-mono resize-none outline-none"
              style={{
                backgroundColor: 'var(--mars-color-surface)',
                color: 'var(--mars-color-text)',
              }}
            />
          ) : (
            <div className="p-4">
              <MarkdownRenderer content={editableContent || ''} />
            </div>
          )}
        </div>

        {/* Right sidebar: download + refinement */}
        <div
          className="w-72 flex-shrink-0 rounded-mars-md border flex flex-col"
          style={{ borderColor: 'var(--mars-color-border)', backgroundColor: 'var(--mars-color-surface)', maxHeight: 420 }}
        >
          {/* Download for current tab */}
          <div
            className="px-3 py-2 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--mars-color-border)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--mars-color-text-secondary)' }}>
              {activeDocInfo?.label}
            </span>
            <Button
              onClick={() => handleDownload(activeTab)}
              variant="secondary"
              size="sm"
            >
              <Download className="w-3 h-3 mr-1" /> Download
            </Button>
          </div>

          <div
            className="px-3 py-2 text-xs font-medium border-b"
            style={{ color: 'var(--mars-color-text-secondary)', borderColor: 'var(--mars-color-border)' }}
          >
            AI Refinement
          </div>
          <InlineRefinementChat
            messages={refinementMessages}
            onSend={handleRefine}
            onApply={handleApplyRefinement}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={onBack} variant="secondary" size="sm">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
        </Button>
        <Button onClick={onNext} variant="primary" size="sm">
          Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Migration Panel (auto-executes, then displays generated scripts)
// ═══════════════════════════════════════════════════════════════════════

interface MigrationPanelProps {
  hook: ReturnType<typeof useReleaseNotesTask>
  onNext: () => void
  onBack: () => void
}

function MigrationPanel({ hook, onNext, onBack }: MigrationPanelProps) {
  const {
    taskId,
    taskState,
    editableContent,
    setEditableContent,
    refinementMessages,
    consoleOutput,
    isExecuting,
    executeStage,
    fetchStageContent,
    saveStageContent,
    refineContent,
  } = hook

  const stage = taskState?.stages.find(s => s.stage_number === 4)
  const isCompleted = stage?.status === 'completed'
  const isFailed = stage?.status === 'failed'
  const isNotStarted = stage?.status === 'pending'
  const isRunning = stage?.status === 'running' || isExecuting

  const [autoTriggered, setAutoTriggered] = useState(false)
  const [contentLoaded, setContentLoaded] = useState(false)
  const [mode, setMode] = useState<'edit' | 'preview'>('preview')
  const [isSaving, setIsSaving] = useState(false)
  const [saveIndicator, setSaveIndicator] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-execute when stage is pending
  useEffect(() => {
    if (isNotStarted && !isExecuting && !autoTriggered) {
      setAutoTriggered(true)
      executeStage(4, { migration_type: 'full' })
    }
  }, [isNotStarted, isExecuting, autoTriggered, executeStage])

  // Fetch content once completed
  useEffect(() => {
    if (isCompleted && !contentLoaded) {
      fetchStageContent(4).then(() => setContentLoaded(true))
    }
  }, [isCompleted, contentLoaded, fetchStageContent])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveIndicator('saving')
    await saveStageContent(4, editableContent, 'migration_script')
    setIsSaving(false)
    setSaveIndicator('saved')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => setSaveIndicator('idle'), 2000)
  }, [editableContent, saveStageContent])

  const handleRefine = useCallback(async (message: string): Promise<string | null> => {
    return await refineContent(4, message, editableContent)
  }, [editableContent, refineContent])

  const handleApplyRefinement = useCallback((content: string) => {
    if (content && content.trim()) {
      setEditableContent(content)
    }
  }, [setEditableContent])

  // ── Still generating ──
  if ((isNotStarted || isRunning) && !isCompleted) {
    return (
      <div className="max-w-full mx-auto space-y-4">
        <ExecutionProgress
          consoleOutput={consoleOutput}
          isExecuting={true}
          stageName="Migration Script Generation"
        />
      </div>
    )
  }

  // ── Failed ──
  if (isFailed) {
    return (
      <div className="max-w-full mx-auto space-y-4">
        <ExecutionProgress
          consoleOutput={consoleOutput}
          isExecuting={false}
          stageName="Migration Script Generation"
        />
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={onBack} variant="secondary" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          <Button onClick={() => setAutoTriggered(false)} variant="secondary" size="sm">
            <Play className="w-3.5 h-3.5 mr-1" /> Retry
          </Button>
        </div>
      </div>
    )
  }

  // ── Completed — show generated migration scripts ──
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        {/* Main content area */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--mars-color-text)' }}>
              Migration Scripts
            </span>
            <div className="flex items-center gap-2">
              {taskId && (
                <Button
                  onClick={() => {
                    const url = getApiUrl(`/api/release-notes/${taskId}/stages/4/download-pdf`)
                    window.open(url, '_blank')
                  }}
                  variant="secondary" size="sm"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
              )}
              <Button
                onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
                variant="secondary" size="sm"
              >
                {mode === 'edit' ? (
                  <><Eye className="w-3.5 h-3.5 mr-1" /> Preview</>
                ) : (
                  <><Edit3 className="w-3.5 h-3.5 mr-1" /> Edit</>
                )}
              </Button>
            </div>
          </div>

          <div
            className="rounded-mars-md border overflow-auto"
            style={{
              borderColor: 'var(--mars-color-border)',
              backgroundColor: 'var(--mars-color-surface)',
              maxHeight: '65vh',
            }}
          >
            {mode === 'edit' ? (
              <textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                className="w-full min-h-[500px] p-4 text-sm font-mono outline-none resize-none"
                style={{
                  backgroundColor: 'var(--mars-color-surface)',
                  color: 'var(--mars-color-text)',
                }}
              />
            ) : (
              <div className="p-4">
                <MarkdownRenderer content={editableContent} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={onBack} variant="secondary" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
            </Button>
            <Button onClick={onNext} variant="primary" size="sm">
              Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>

        {/* AI Refinement sidebar */}
        <div className="w-72 flex-shrink-0">
          <InlineRefinementChat
            messages={refinementMessages}
            onSend={handleRefine}
            onApply={handleApplyRefinement}
          />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Package Panel — final stage with artifacts, cost & downloads
// ═══════════════════════════════════════════════════════════════════════

interface PackagePanelProps {
  hook: ReturnType<typeof useReleaseNotesTask>
  onBack: () => void
}

interface PackageArtifact {
  key: string
  filename: string
  label: string
  stage_num: number
  available: boolean
}

interface PackageInfo {
  task_id: string
  repo_name: string
  artifacts: PackageArtifact[]
  total_cost_usd: number | null
  completed_stages: number
  total_stages: number
}

function PackagePanel({ hook, onBack }: PackagePanelProps) {
  const { taskId, taskState, consoleOutput, isExecuting, executeStage } = hook
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)

  const stage = taskState?.stages.find(s => s.stage_number === 5)
  const isCompleted = stage?.status === 'completed'
  const isFailed = stage?.status === 'failed'
  const isNotStarted = stage?.status === 'pending'

  // Load package info once package stage completes
  useEffect(() => {
    if (isCompleted && taskId && !packageInfo) {
      setLoadingInfo(true)
      fetch(getApiUrl(`/api/release-notes/${taskId}/package-info`))
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setPackageInfo(data) })
        .catch(() => {})
        .finally(() => setLoadingInfo(false))
    }
  }, [isCompleted, taskId, packageInfo])

  const handleDownloadMd = useCallback((artifact: PackageArtifact) => {
    if (!taskId) return
    const url = getApiUrl(
      `/api/release-notes/${taskId}/stages/${artifact.stage_num}/download?doc_key=${artifact.key}`
    )
    window.open(url, '_blank')
  }, [taskId])

  const handleDownloadPdf = useCallback((artifact: PackageArtifact) => {
    if (!taskId) return
    const url = getApiUrl(
      `/api/release-notes/${taskId}/stages/${artifact.stage_num}/download-pdf?doc_key=${artifact.key}`
    )
    window.open(url, '_blank')
  }, [taskId])

  const handleDownloadAll = useCallback(() => {
    if (!taskId) return
    const url = getApiUrl(`/api/release-notes/${taskId}/download-all`)
    window.open(url, '_blank')
  }, [taskId])

  // Pre-execution state
  if (isNotStarted && !isExecuting) {
    return (
      <div className="max-w-full mx-auto space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--mars-color-text)' }}>
            Package
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--mars-color-text-secondary)' }}>
          Bundle all outputs into the final package.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={onBack} variant="secondary" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          <Button onClick={() => executeStage(5)} variant="primary" size="sm">
            <Play className="w-3.5 h-3.5 mr-1" /> Run Package
          </Button>
        </div>
      </div>
    )
  }

  // Running state
  if (isExecuting || (!isCompleted && !isFailed)) {
    return (
      <div className="max-w-full mx-auto space-y-4">
        <ExecutionProgress
          consoleOutput={consoleOutput}
          isExecuting={isExecuting}
          stageName="Package"
        />
      </div>
    )
  }

  // Failed state
  if (isFailed) {
    return (
      <div className="max-w-full mx-auto space-y-4">
        <ExecutionProgress
          consoleOutput={consoleOutput}
          isExecuting={false}
          stageName="Package"
        />
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={onBack} variant="secondary" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          <Button onClick={() => executeStage(5)} variant="secondary" size="sm">
            <Play className="w-3.5 h-3.5 mr-1" /> Retry
          </Button>
        </div>
      </div>
    )
  }

  // Completed state — show artifacts + cost
  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Success banner */}
      <div
        className="rounded-mars-md border p-4 flex items-center gap-3"
        style={{
          backgroundColor: 'rgba(34,197,94,0.08)',
          borderColor: 'rgba(34,197,94,0.3)',
        }}
      >
        <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: '#22c55e' }} />
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--mars-color-text)' }}>
            Release Notes Complete
          </h3>
          <p className="text-sm" style={{ color: 'var(--mars-color-text-secondary)' }}>
            All {packageInfo?.completed_stages ?? 5} stages completed successfully.
          </p>
        </div>
      </div>

      {/* Generated Artifacts */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--mars-color-text)' }}>
          Generated Artifacts
        </h3>
        <div className="space-y-2">
          {loadingInfo ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--mars-color-primary)' }} />
              <span className="text-sm" style={{ color: 'var(--mars-color-text-secondary)' }}>Loading artifacts...</span>
            </div>
          ) : packageInfo?.artifacts && packageInfo.artifacts.length > 0 ? (
            packageInfo.artifacts.map((artifact) => (
              <div
                key={artifact.key}
                className="flex items-center justify-between rounded-mars-md border px-4 py-3"
                style={{
                  backgroundColor: 'var(--mars-color-surface)',
                  borderColor: 'var(--mars-color-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--mars-color-text-tertiary)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--mars-color-text)' }}>
                    {artifact.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadMd(artifact)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-mars-sm text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--mars-color-accent)' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Markdown
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(artifact)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-mars-sm text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--mars-color-accent)' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm py-2" style={{ color: 'var(--mars-color-text-tertiary)' }}>
              No artifacts found.
            </p>
          )}
        </div>
      </div>

      {/* Download All */}
      {packageInfo?.artifacts && packageInfo.artifacts.length > 0 && (
        <div>
          <Button onClick={handleDownloadAll} variant="primary" size="md" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download All as ZIP
          </Button>
        </div>
      )}

      {/* Cost Summary */}
      <div
        className="rounded-mars-md border p-4"
        style={{
          backgroundColor: 'var(--mars-color-surface)',
          borderColor: 'var(--mars-color-border)',
        }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--mars-color-text)' }}>
          Cost Summary
        </h3>
        <div className="flex items-center gap-8">
          <div>
            <p className="text-xs" style={{ color: 'var(--mars-color-text-tertiary)' }}>Total Cost</p>
            <p className="text-xl font-bold" style={{ color: 'var(--mars-color-text)' }}>
              {packageInfo?.total_cost_usd != null
                ? `$${packageInfo.total_cost_usd.toFixed(4)}`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--mars-color-text-tertiary)' }}>Stages</p>
            <p className="text-xl font-bold" style={{ color: 'var(--mars-color-text)' }}>
              {packageInfo?.completed_stages ?? '—'}/{packageInfo?.total_stages ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={onBack} variant="secondary" size="sm">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Inline Refinement Chat (lightweight version)
// ═══════════════════════════════════════════════════════════════════════

interface InlineRefinementChatProps {
  messages: RefinementMessage[]
  onSend: (message: string) => Promise<string | null>
  onApply: (content: string) => void
}

function InlineRefinementChat({ messages, onSend, onApply }: InlineRefinementChatProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    await onSend(msg)
    setSending(false)
  }, [input, sending, onSend])

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3" style={{ maxHeight: 300 }}>
        {messages.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--mars-color-text-tertiary)' }}>
            Ask the AI to refine, expand, or restructure the content.
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[90%] px-3 py-2 rounded-mars-md text-xs"
              style={{
                backgroundColor: msg.role === 'user'
                  ? 'var(--mars-color-accent-subtle, rgba(99,102,241,0.1))'
                  : 'var(--mars-color-surface-overlay)',
                color: 'var(--mars-color-text)',
              }}
            >
              <p className="whitespace-pre-wrap">{msg.role === 'user' ? msg.content : msg.content.slice(0, 500)}{msg.role === 'assistant' && msg.content.length > 500 ? '...' : ''}</p>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => onApply(msg.content)}
                  className="mt-2 px-2 py-1 text-[10px] font-medium rounded"
                  style={{ color: 'var(--mars-color-accent)', backgroundColor: 'var(--mars-color-accent-subtle, rgba(99,102,241,0.1))' }}
                >
                  <Check className="w-3 h-3 inline mr-0.5" />Apply to editor
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t flex gap-2" style={{ borderColor: 'var(--mars-color-border)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Refine..."
          className="flex-1 text-xs px-2 py-1.5 rounded-mars-sm border outline-none"
          style={{
            backgroundColor: 'var(--mars-color-surface)',
            borderColor: 'var(--mars-color-border)',
            color: 'var(--mars-color-text)',
          }}
        />
        <Button onClick={handleSend} disabled={!input.trim() || sending} variant="primary" size="sm">
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        </Button>
      </div>
    </>
  )
}
