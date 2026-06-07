/**
 * RuntimeEvent — the contract between the runtime and all clients.
 *
 * The runtime yields these events via AsyncGenerator<RuntimeEvent>.
 * Clients consume them and render accordingly (chat panel, terminal, etc).
 */
export type RuntimeEvent =
  | { type: 'assistant_token'; token: string }
  | { type: 'tool_started'; name: string; input: Record<string, unknown> }
  | { type: 'tool_completed'; name: string; result: string; durationMs: number }
  | { type: 'tool_failed'; name: string; error: string }
  | {
      type: 'tool_approval_required'
      id: string
      name: string
      input: Record<string, unknown>
    }
  | { type: 'task_completed'; summary: string }
  | { type: 'task_failed'; error: string }
  | { type: 'context_compressed'; tokensBefore: number; tokensAfter: number }
