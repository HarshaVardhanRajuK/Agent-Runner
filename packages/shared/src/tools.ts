/**
 * Tool system shared types.
 */

/** JSON Schema subset — enough for tool input schemas */
export interface JsonSchema {
  type: 'object'
  properties: Record<string, JsonSchemaProperty>
  required?: string[]
}

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array'
  description?: string
  items?: { type: string }
}

/** What the LLM sees — passed in every API request */
export interface ToolSchema {
  name: string
  description: string
  inputSchema: JsonSchema
}

/** What a tool execution returns */
export interface ToolResult {
  output: string
  durationMs: number
}

/** Platform-specific I/O operations — implemented per client */
export interface PlatformAdapter {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  runCommand(command: string, cwd: string): Promise<CommandResult>
  listDirectory(path: string): Promise<DirectoryEntry[]>
}

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface DirectoryEntry {
  name: string
  isDirectory: boolean
}
