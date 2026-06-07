import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

await build({
  entryPoints: [join(root, 'src/extension.ts')],
  bundle: true,
  outfile: join(root, 'dist/extension.js'),
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  // vscode is injected by the extension host at runtime — never on disk
  external: ['vscode'],
  minify: process.env['NODE_ENV'] === 'production',
  sourcemap: process.env['NODE_ENV'] !== 'production',
})

console.log('Extension bundled → dist/extension.js')
