/**
 * Bundles the React webview into a single dist/webview/index.js using esbuild.
 */
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const isProd = process.env.NODE_ENV === 'production'

await build({
  entryPoints: [join(root, 'src/webview/main.tsx')],
  bundle: true,
  outfile: join(root, 'dist/webview/index.js'),
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  minify: isProd,
  sourcemap: !isProd,
  define: isProd ? { 'process.env.NODE_ENV': '"production"' } : undefined,
})

console.log(`Webview bundled → dist/webview/index.js${isProd ? ' (minified)' : ''}`)
