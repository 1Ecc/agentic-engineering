import { ref } from 'vue'

export interface WorkflowDraft {
  yaml: string
  prompt?: string
  contextId?: string
  contextYaml?: string
  isModify: boolean
  savedAt?: string
  selectedNodeId?: string
}

export const workflowDraft = ref<WorkflowDraft | null>(null)

export function setWorkflowDraft(draft: WorkflowDraft): void {
  workflowDraft.value = draft
  try {
    sessionStorage.setItem('workflow-draft', JSON.stringify(draft))
  } catch {
    // ignore quota errors
  }
}

export function loadWorkflowDraft(): WorkflowDraft | null {
  if (workflowDraft.value) return workflowDraft.value
  try {
    const raw = sessionStorage.getItem('workflow-draft')
    if (!raw) return null
    workflowDraft.value = JSON.parse(raw) as WorkflowDraft
    return workflowDraft.value
  } catch {
    return null
  }
}

export function clearWorkflowDraft(): void {
  workflowDraft.value = null
  try {
    sessionStorage.removeItem('workflow-draft')
  } catch {
    // ignore
  }
}
