import type { ToolSchema, ToolResult, PlatformAdapter } from '@agent-runner/shared'

export const readFileSchema: ToolSchema = {
  name: 'read_file',
  description:
    'Read the contents of a file at the given path. ' +
    'Use this to understand existing code before modifying it. ' +
    'Always read a file before writing to it.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or workspace-relative file path to read.',
      },
    },
    required: ['path'],
  },
}

export async function readFile(
  input: Record<string, unknown>,
  adapter: PlatformAdapter,
): Promise<ToolResult> {
  const start = Date.now()
  const path = String(input['path'] ?? '')

  if (!path) {
    return { output: 'Error: path is required', durationMs: 0 }
  }

  try {
    const content = await adapter.readFile(path)
    const lines = content.split('\n').length
    return {
      output: `[${lines} lines]\n${content}`,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      output: `Error reading file: ${String(err)}`,
      durationMs: Date.now() - start,
    }
  }
}
