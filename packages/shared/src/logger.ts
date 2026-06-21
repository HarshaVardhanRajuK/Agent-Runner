export interface Logger {
  trace(msg: string): void
  debug(msg: string): void
  info(msg: string): void
  warn(msg: string): void
  error(msg: string, err?: unknown): void
}

/** No-op logger that swallows everything. Use as default. */
export const silentLogger: Logger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
