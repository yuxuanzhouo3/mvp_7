export const TOOL_SUCCESS_EVENT = "tool-action-success"

export interface ToolSuccessDetail {
  toolId: string
  referenceId?: string
}

function buildReferenceId(toolId: string) {
  const random = Math.random().toString(36).slice(2, 10)
  return `success_${toolId}_${Date.now()}_${random}`.slice(0, 180)
}

export function emitToolSuccess(toolId: string, referenceId?: string) {
  if (typeof window === "undefined") return
  const finalToolId = String(toolId || "").trim()
  if (!finalToolId) return

  const detail: ToolSuccessDetail = {
    toolId: finalToolId,
    referenceId: String(referenceId || buildReferenceId(finalToolId)).slice(0, 180),
  }

  window.dispatchEvent(new CustomEvent<ToolSuccessDetail>(TOOL_SUCCESS_EVENT, { detail }))
}
