import type { ToolSchema, ToolResult, PlatformAdapter } from '@agent-runner/shared'

const BLOCKED_PREFIXES = ['rm -rf /', 'sudo rm', 'mkfs', 'dd if=', '> /dev/']

export const runCommandSchema: ToolSchema = {
  name: 'run_command',
  description:
    'Run a shell command in the workspace root and return stdout, stderr, and exit code. ' +
    'Use this to run scripts, execute tests, install packages, or verify your work. ' +
    'Commands time out after 30 seconds.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to run.',
      },
    },
    required: ['command'],
  },
}

export async function runCommand(
  input: Record<string, unknown>,
  adapter: PlatformAdapter,
  workspaceRoot: string,
): Promise<ToolResult> {
  const start = Date.now()
  const command = String(input['command'] ?? '')

  if (!command) {
    return { output: 'Error: command is required', durationMs: 0 }
  }

  for (const prefix of BLOCKED_PREFIXES) {
    if (command.trimStart().startsWith(prefix)) {
      return {
        output: `Error: command blocked for safety ('${prefix}...')`,
        durationMs: 0,
      }
    }
  }

  try {
    const result = await adapter.runCommand(command, workspaceRoot)
    const parts: string[] = [`exit_code: ${result.exitCode}`]
    if (result.stdout.trim()) parts.push(`stdout:\n${result.stdout.trimEnd()}`)
    if (result.stderr.trim()) parts.push(`stderr:\n${result.stderr.trimEnd()}`)
    return {
      output: parts.join('\n'),
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      output: `Error running command: ${String(err)}`,
      durationMs: Date.now() - start,
    }
  }
}
