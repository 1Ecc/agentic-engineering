import type {
  NodeDefinition,
  RecordingSession,
  RunRecord,
  Workflow,
  WorkflowMeta,
  WorkflowValidationResult,
  ResultView,
} from './types.js'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly platform?: string,
    public readonly step?: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options?.headers,
    },
  })
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string
    code?: string
    platform?: string
    step?: string
    details?: unknown
  }
  if (!response.ok) {
    throw new ApiError(data.error ?? `请求失败：${response.status}`, response.status, data.code, data.platform, data.step, data.details)
  }
  return data
}

export async function listWorkflows(): Promise<WorkflowMeta[]> {
  const data = await apiFetch<{ workflows: WorkflowMeta[] }>('/api/workflows')
  return data.workflows
}

export async function getWorkflow(id: string): Promise<{ yaml: string; meta: WorkflowMeta }> {
  return apiFetch<{ yaml: string; meta: WorkflowMeta }>(`/api/workflows/${encodeURIComponent(id)}`)
}

export async function saveWorkflow(yaml: string, meta?: Partial<WorkflowMeta>): Promise<WorkflowMeta> {
  const data = await apiFetch<{ workflow: WorkflowMeta }>('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({ yaml, meta }),
  })
  return data.workflow
}

export async function updateWorkflow(id: string, yaml: string, meta?: Partial<WorkflowMeta>): Promise<WorkflowMeta> {
  const data = await apiFetch<{ workflow: WorkflowMeta }>(`/api/workflows/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ yaml, meta }),
  })
  return data.workflow
}

export async function deleteWorkflow(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/workflows/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function validateWorkflowDraft(yaml: string): Promise<{ validation: WorkflowValidationResult; workflow: Workflow }> {
  return apiFetch<{ validation: WorkflowValidationResult; workflow: Workflow }>('/api/workflows/validate', {
    method: 'POST',
    body: JSON.stringify({ yaml }),
  })
}

export async function listNodes(): Promise<NodeDefinition[]> {
  const data = await apiFetch<{ nodes: NodeDefinition[] }>('/api/nodes')
  return data.nodes
}

export async function getNode(type: string): Promise<NodeDefinition> {
  const data = await apiFetch<{ node: NodeDefinition }>(`/api/nodes/${encodeURIComponent(type)}`)
  return data.node
}

export async function startRecording(input?: { target_url?: string }): Promise<RecordingSession> {
  return apiFetch<RecordingSession>('/api/nodes/record/start', {
    method: 'POST',
    body: JSON.stringify(input ?? {}),
  })
}

export async function getRecordingStatus(recordingId: string): Promise<RecordingSession> {
  return apiFetch<RecordingSession>(`/api/nodes/record/${encodeURIComponent(recordingId)}/status`)
}

export async function finishRecording(input: {
  recording_id: string
  name?: string
  description: string
}): Promise<NodeDefinition> {
  const data = await apiFetch<{ node: NodeDefinition }>('/api/nodes/record/finish', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.node
}

export async function generateNodeFromCurl(input: {
  curl?: string
  name?: string
  description?: string
  currentNode?: NodeDefinition
}): Promise<NodeDefinition> {
  const data = await apiFetch<{ node: NodeDefinition }>('/api/nodes/generate-from-curl', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.node
}

export async function registerNode(spec: NodeDefinition): Promise<{ type: string; path: string }> {
  return apiFetch<{ type: string; path: string }>('/api/nodes', {
    method: 'POST',
    body: JSON.stringify({ spec }),
  })
}

export async function invokeNode(type: string, inputs: Record<string, unknown>): Promise<unknown> {
  const data = await apiFetch<{ result: unknown }>(`/api/nodes/${encodeURIComponent(type)}/invoke`, {
    method: 'POST',
    body: JSON.stringify({ inputs }),
  })
  return data.result
}

export async function invokeDraftNode(spec: NodeDefinition, inputs: Record<string, unknown>): Promise<unknown> {
  const data = await apiFetch<{ result: unknown }>('/api/nodes/invoke-draft', {
    method: 'POST',
    body: JSON.stringify({ spec, inputs }),
  })
  return data.result
}

export async function deleteNode(type: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/nodes/${encodeURIComponent(type)}`, { method: 'DELETE' })
}

export async function updateNodeVisibility(type: string, visibility: 'public' | 'private'): Promise<NodeDefinition> {
  const data = await apiFetch<{ node: NodeDefinition }>(`/api/nodes/${encodeURIComponent(type)}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ visibility }),
  })
  return data.node
}

export async function runWorkflow(id: string, inputs: Record<string, unknown>): Promise<{ run_id: string }> {
  return apiFetch<{ run_id: string }>(`/api/workflows/${encodeURIComponent(id)}/run`, {
    method: 'POST',
    body: JSON.stringify({ inputs }),
  })
}

export async function runDraftWorkflow(yaml: string, inputs: Record<string, unknown>): Promise<{ run_id: string; workflow_id: string }> {
  return apiFetch<{ run_id: string; workflow_id: string }>('/api/workflows/run-draft', {
    method: 'POST',
    body: JSON.stringify({ yaml, inputs }),
  })
}

export async function getRun(workflowId: string, runId: string): Promise<RunRecord> {
  return apiFetch<RunRecord>(`/api/workflows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}`)
}

export async function listRuns(workflowId: string): Promise<RunRecord[]> {
  const data = await apiFetch<{ runs: RunRecord[] }>(`/api/workflows/${encodeURIComponent(workflowId)}/runs`)
  return data.runs
}

export async function runSop1(workOrderNo: string): Promise<{ run_id: string }> {
  return apiFetch<{ run_id: string }>('/api/workflows/sop1-direct-order-invoice/run', {
    method: 'POST',
    body: JSON.stringify({ work_order_no: workOrderNo }),
  })
}

export async function getSop1Run(runId: string): Promise<{
  run_id: string
  status: 'running' | 'success' | 'failed'
  result?: Record<string, unknown>
  error?: string
}> {
  return apiFetch(`/api/workflows/sop1-direct-order-invoice/runs/${encodeURIComponent(runId)}`)
}

export interface GenerateOptions {
  prompt: string
  contextYaml?: string
  onToken?: (token: string) => void
  signal?: AbortSignal
}

export async function generateWorkflow(opts: GenerateOptions): Promise<string> {
  const response = await fetch(apiUrl('/api/workflows/generate'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: opts.prompt, contextYaml: opts.contextYaml }),
    signal: opts.signal,
  })
  if (!response.ok || !response.body) {
    throw new Error(`生成失败：${response.status}`)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finalYaml = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const lines = block.split('\n')
      let event = 'message'
      let dataLine = ''
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLine += line.slice(5).trim()
      }
      if (!dataLine) continue
      try {
        const parsed = JSON.parse(dataLine) as { token?: string; yaml?: string }
        if (event === 'token' && parsed.token) {
          finalYaml += parsed.token
          opts.onToken?.(parsed.token)
        } else if (event === 'done' && parsed.yaml) {
          finalYaml = parsed.yaml
        }
      } catch {
        // ignore malformed chunk
      }
    }
  }
  return finalYaml
}

export async function updateNode(type: string, spec: NodeDefinition): Promise<NodeDefinition> {
  const data = await apiFetch<{ node: NodeDefinition }>(`/api/nodes/${encodeURIComponent(type)}`, {
    method: 'PUT',
    body: JSON.stringify({ spec }),
  })
  return data.node
}

export async function generateResultViews(input: {
  result: unknown
  existingViews?: ResultView[]
}): Promise<ResultView[]> {
  const data = await apiFetch<{ views: ResultView[] }>('/api/results/views/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.views
}

export async function sendMail(input: {
  to: string[]
  cc: string[]
  subject: string
  body: string
}): Promise<{ message_id: string }> {
  return apiFetch<{ message_id: string }>('/api/mail/send', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export interface AuthPlatformStatus {
  platform: string
  ok: boolean
  message: string
}

export async function authStart(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/api/auth/browser-login/start', { method: 'POST' })
}

export async function authFinish(): Promise<{ state_path: string }> {
  return apiFetch<{ state_path: string }>('/api/auth/browser-login/finish', { method: 'POST' })
}

export async function authStatus(): Promise<{ platforms: AuthPlatformStatus[] }> {
  return apiFetch<{ platforms: AuthPlatformStatus[] }>('/api/auth/status')
}
