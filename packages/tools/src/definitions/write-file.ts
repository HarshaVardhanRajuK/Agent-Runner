import type { ToolSchema, ToolResult, PlatformAdapter } from '@agent-runner/shared'

export const writeFileSchema: ToolSchema = {
  name: 'write_file',
  description:
    'Write content to a file. Creates the file and any parent directories if they ' +
    "don't exist. Overwrites if it already exists. " +
    'Use this to create new files or update existing ones.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or workspace-relative file path to write.',
      },
      content: {
        type: 'string',
        description: 'The full content to write to the file.',
      },
    },
    required: ['path', 'content'],
  },
}

export async function writeFile(
  input: Record<string, unknown>,
  adapter: PlatformAdapter,
): Promise<ToolResult> {
  const start = Date.now()
  const path = String(input['path'] ?? '')
  const content = String(input['content'] ?? '')

  if (!path) {
    return { output: 'Error: path is required', durationMs: 0 }
  }

  try {
    await adapter.writeFile(path, content)
    const lines = content.split('\n').length
    return {
      output: `Written ${lines} lines to ${path}`,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      output: `Error writing file: ${String(err)}`,
      durationMs: Date.now() - start,
    }
  }
}
