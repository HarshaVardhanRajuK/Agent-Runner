import type { ToolSchema, ToolResult, PlatformAdapter } from '@agent-runner/shared'

export const listDirectorySchema: ToolSchema = {
  name: 'list_directory',
  description:
    'List files and directories at the given path. ' +
    'Use this to explore the workspace structure before reading or writing files.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or workspace-relative directory path to list.',
      },
    },
    required: ['path'],
  },
}

export async function listDirectory(
  input: Record<string, unknown>,
  adapter: PlatformAdapter,
): Promise<ToolResult> {
  const start = Date.now()
  const path = String(input['path'] ?? '')

  if (!path) {
    return { output: 'Error: path is required', durationMs: 0 }
  }

  try {
    const entries = await adapter.listDirectory(path)
    if (entries.length === 0) {
      return { output: '(empty directory)', durationMs: Date.now() - start }
    }

    const lines = entries
      .sort((a, b) => {
        // Directories first, then files, alphabetical within each group
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .map((e) => (e.isDirectory ? `${e.name}/` : e.name))

    return {
      output: lines.join('\n'),
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      output: `Error listing directory: ${String(err)}`,
      durationMs: Date.now() - start,
    }
  }
}
