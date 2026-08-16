/**
 * Build faces for the dsh-global-prompt bundle.
 *
 * Two artifacts, mirroring the harness client-bundle contract so the shell's
 * `__ModuleLoader__` can load them:
 * - lib/index.js  — the Node host plugin (ESM, node builtins only).
 * - lib/client.js — the browser settings-section plugin (CJS factory wrapped
 *   in `window.__ModuleLoader__.load(...)`; platform modules are externals
 *   resolved through the shell's frozen module table).
 */
import type { UserConfig } from 'tsdown'

// Mirror of packages/client/web/src/platform.ts: specifiers the shell shares
// into the frozen module table. Everything else must inline or fail at boot.
const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
] as const

// Runtime store exemption, same as the harness preset (tsdown.client.ts).
const CLIENT_EXTERNALS = [...PLATFORM_MODULES, '@deepseek-ai/dsh-client-runtime/client'] as const

const nodeLib: UserConfig = {
  name: 'dsh-global-prompt/lib',
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  dts: false,
  clean: false,
  fixedExtension: false,
}

const clientBundle: UserConfig = {
  name: 'dsh-global-prompt/client',
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: false,
  external: [...CLIENT_EXTERNALS],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id as never) ? undefined : true),
  outputOptions: {
    entryFileNames: 'client.js',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify('dsh-global-prompt')}, factory: (require) => {`,
    footer: 'return module.exports; } });',
  },
}

export default [nodeLib, clientBundle]
