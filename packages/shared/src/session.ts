/**
 * Session — the unit of conversation persistence.
 * One session per workspace, persisted to disk between runs.
 */

export type StopReason = 'tool_use' | 'end_turn' | 'max_tokens'

export type AssistantContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

export type Message =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: AssistantContentBlock[]; stopReason: StopReason }
  | { role: 'tool'; toolCallId: string; toolName: string; content: string }
  | { role: 'summary'; content: string; replacedCount: number }

export interface Session {
  id: string
  workspaceRoot: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  totalTasks: number
  messages: Message[]
}
