import * as vscode from 'vscode'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { PlatformAdapter, CommandResult, DirectoryEntry } from '@agent-runner/shared'

const execAsync = promisify(exec)

/**
 * VS Code implementation of PlatformAdapter.
 * Uses vscode.workspace.fs for file operations (respects virtual filesystems).
 * Uses node:child_process for commands (extension host is a Node.js process).
 */
export class VsCodeAdapter implements PlatformAdapter {
  async readFile(path: string): Promise<string> {
    const uri = vscode.Uri.file(path)
    const bytes = await vscode.workspace.fs.readFile(uri)
    return new TextDecoder().decode(bytes)
  }

  async writeFile(path: string, content: string): Promise<void> {
    const uri = vscode.Uri.file(path)
    // Ensure parent directory exists
    const parentUri = vscode.Uri.file(path.substring(0, path.lastIndexOf('/')))
    try {
      await vscode.workspace.fs.createDirectory(parentUri)
    } catch {
      // Directory may already exist — ignore
    }
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content))
  }

  async runCommand(command: string, cwd: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: 30_000,
        maxBuffer: 1024 * 1024 * 10, // 10MB
      })
      return { exitCode: 0, stdout, stderr }
    } catch (err: unknown) {
      const e = err as { code?: number; stdout?: string; stderr?: string; message?: string }
      return {
        exitCode: e.code ?? 1,
        stdout: e.stdout ?? '',
        stderr: e.stderr ?? e.message ?? String(err),
      }
    }
  }

  async listDirectory(path: string): Promise<DirectoryEntry[]> {
    const uri = vscode.Uri.file(path)
    const entries = await vscode.workspace.fs.readDirectory(uri)
    return entries.map(([name, type]) => ({
      name,
      isDirectory: type === vscode.FileType.Directory,
    }))
  }
}
