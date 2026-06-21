export { ToolRegistry } from './registry.js'
export { readFileSchema, readFile } from './definitions/read-file.js'
export { writeFileSchema, writeFile } from './definitions/write-file.js'
export { runCommandSchema, runCommand } from './definitions/run-command.js'
export { listDirectorySchema, listDirectory } from './definitions/list-directory.js'

import type { PlatformAdapter, Logger } from '@agent-runner/shared'
import { ToolRegistry } from './registry.js'
import { readFileSchema, readFile } from './definitions/read-file.js'
import { writeFileSchema, writeFile } from './definitions/write-file.js'
import { runCommandSchema, runCommand } from './definitions/run-command.js'
import { listDirectorySchema, listDirectory } from './definitions/list-directory.js'

/**
 * Create a ToolRegistry pre-populated with all v0.1 tools.
 * The workspaceRoot is used as the cwd for run_command.
 */
export function createDefaultRegistry(
  adapter: PlatformAdapter,
  workspaceRoot: string,
  logger?: Logger,
): ToolRegistry {
  return new ToolRegistry(adapter, logger)
    .register(readFileSchema, (input, adp) => readFile(input, adp))
    .register(writeFileSchema, (input, adp) => writeFile(input, adp))
    .register(runCommandSchema, (input, adp) => runCommand(input, adp, workspaceRoot))
    .register(listDirectorySchema, (input, adp) => listDirectory(input, adp))
}
