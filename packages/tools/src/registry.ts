import type { ToolSchema, ToolResult, PlatformAdapter, Logger } from '@agent-runner/shared'
import { silentLogger } from '@agent-runner/shared'

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
 */
export class ToolRegistry {
  readonly #tools = new Map<string, ToolEntry>()
  readonly #adapter: PlatformAdapter
  readonly #log: Logger

  constructor(adapter: PlatformAdapter, logger?: Logger) {
    this.#adapter = adapter
    this.#log = logger ?? silentLogger
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
      this.#log.warn(`Unknown tool called: ${name}`)
      return { output: `Error: unknown tool '${name}'`, durationMs: 0 }
    }
    const start = Date.now()
    this.#log.info(`Tool execute: ${name}`)
    try {
      const result = await tool.execute(input, this.#adapter)
      this.#log.debug(`Tool ${name} completed in ${Date.now() - start}ms`)
      return result
    } catch (err) {
      this.#log.error(`Tool ${name} failed`, err)
      return {
        output: `Error: ${String(err)}`,
        durationMs: Date.now() - start,
      }
    }
  }
}
