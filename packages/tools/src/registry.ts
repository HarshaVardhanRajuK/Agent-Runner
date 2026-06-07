import type { ToolSchema, ToolResult, PlatformAdapter } from '@agent-runner/shared'

type ToolExecutor = (
  input: Record<string, unknown>,
  adapter: PlatformAdapter,
) => Promise<ToolResult>

interface ToolEntry {
  schema: ToolSchema
  execute: ToolExecutor
}

/**
 * ToolRegistry — holds all tools available to the agent.
 *
 * The runtime calls:
 *   registry.schemas()              → pass to LLM with each request
 *   registry.execute(name, input)   → run when LLM requests a tool
 */
export class ToolRegistry {
  readonly #tools = new Map<string, ToolEntry>()
  readonly #adapter: PlatformAdapter

  constructor(adapter: PlatformAdapter) {
    this.#adapter = adapter
  }

  register(schema: ToolSchema, execute: ToolExecutor): this {
    this.#tools.set(schema.name, { schema, execute })
    return this
  }

  schemas(): ToolSchema[] {
    return [...this.#tools.values()].map((t) => t.schema)
  }

  async execute(name: string, input: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.#tools.get(name)
    if (!tool) {
      return { output: `Error: unknown tool '${name}'`, durationMs: 0 }
    }
    const start = Date.now()
    try {
      return await tool.execute(input, this.#adapter)
    } catch (err) {
      return {
        output: `Error: ${String(err)}`,
        durationMs: Date.now() - start,
      }
    }
  }
}
