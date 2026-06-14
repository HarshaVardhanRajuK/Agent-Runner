/**
 * Bundles the React webview into a single dist/webview/index.js using esbuild.
 */
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

await build({
  entryPoints: [join(root, 'src/webview/main.tsx')],
  bundle: true,
  outfile: join(root, 'dist/webview/index.js'),
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  minify: process.env['NODE_ENV'] === 'production',
  sourcemap: process.env['NODE_ENV'] !== 'production',
  external: [],
})

console.log('Webview bundled → dist/webview/index.js')
