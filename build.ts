/**
 * Build script: bundles src/ with Bun, then post-processes the output
 * to fix React 19 canary + Ink compatibility issues and SDK shims.
 */

// ─── Bun plugin: special module resolution ───

// Feature flags to enable (bun:bundle feature() calls)
const enabledFeatures = new Set([
  'BUDDY',
])

const resolverPlugin: import('bun').BunPlugin = {
  name: 'custom-resolver',
  setup(build) {
    build.onResolve({ filter: /^react\/compiler-runtime$/ }, () => ({
      path: require.resolve('react-compiler-runtime'),
    }))
    build.onResolve({ filter: /\.d\.ts$/ }, () => ({
      path: import.meta.dir + '/src/empty.ts',
    }))
    // Provide bun:bundle feature() stub
    build.onResolve({ filter: /^bun:bundle$/ }, () => ({
      path: 'bun:bundle',
      namespace: 'bun-bundle',
    }))
    build.onLoad({ filter: /.*/, namespace: 'bun-bundle' }, () => ({
      contents: `export function feature(name) { return ${JSON.stringify([...enabledFeatures])}.includes(name); }`,
      loader: 'js',
    }))
    // Pre-process source files to replace feature('FLAG') with true/false literals
    // so the bundler can statically analyze conditional requires
    build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
      let contents = await Bun.file(args.path).text()
      const hadFeature = contents.includes("feature(")
      if (hadFeature) {
        for (const f of enabledFeatures) {
          contents = contents.replaceAll(`feature('${f}')`, 'true')
          contents = contents.replaceAll(`feature("${f}")`, 'true')
        }
        // Replace remaining feature() calls with false
        contents = contents.replace(/\bfeature\s*\(\s*['"][^'"]+['"]\s*\)/g, 'false')
      }
      return { contents, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' }
    })
  },
}

// Packages unavailable in external builds (internal Anthropic or native addons)
const unavailableExternals = [
  '@ant/claude-for-chrome-mcp',
  '@ant/computer-use-mcp',
  '@ant/computer-use-mcp/types',
  '@ant/computer-use-mcp/sentinelApps',
  '@ant/computer-use-input',
  '@ant/computer-use-swift',
  '@anthropic-ai/claude-agent-sdk',
  '@anthropic-ai/foundry-sdk',
  '@anthropic-ai/mcpb',
  '@anthropic-ai/sandbox-runtime',
  'color-diff-napi',
  'modifiers-napi',
]

// ─── Bundle ───

const result = await Bun.build({
  entrypoints: ['./src/entrypoints/cli.tsx'],
  outdir: './dist',
  target: 'node',
  format: 'esm',
  sourcemap: 'linked',
  minify: false,
  plugins: [resolverPlugin],
  define: {
    'MACRO.VERSION': JSON.stringify('2.1.88'),
    'MACRO.BUILD_TIME': JSON.stringify(new Date().toISOString()),
    'MACRO.PACKAGE_URL': JSON.stringify('@anthropic-ai/claude-code'),
    'MACRO.NATIVE_PACKAGE_URL': JSON.stringify('@anthropic-ai/claude-code'),
    'MACRO.ISSUES_EXPLAINER': JSON.stringify('report the issue at https://github.com/anthropics/claude-code/issues'),
    'MACRO.FEEDBACK_CHANNEL': JSON.stringify('https://github.com/anthropics/claude-code/issues'),
    'MACRO.VERSION_CHANGELOG': JSON.stringify(''),
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  external: [
    'yoga-wasm-web',
    ...unavailableExternals,
    '@opentelemetry/exporter-logs-otlp-grpc',
    '@opentelemetry/exporter-logs-otlp-http',
    '@opentelemetry/exporter-logs-otlp-proto',
    '@opentelemetry/exporter-metrics-otlp-grpc',
    '@opentelemetry/exporter-metrics-otlp-http',
    '@opentelemetry/exporter-metrics-otlp-proto',
    '@opentelemetry/exporter-prometheus',
    '@opentelemetry/exporter-trace-otlp-grpc',
    '@opentelemetry/exporter-trace-otlp-http',
    '@opentelemetry/exporter-trace-otlp-proto',
    'sharp',
  ],
  loader: {
    '.md': 'text',
    '.txt': 'text',
  },
})

if (!result.success) {
  console.error('Build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log(`Build succeeded: ${result.outputs.length} file(s) written to ./dist/`)

// ─── Post-process: patch the bundle ───

const outPath = './dist/cli.js'
let code = await Bun.file(outPath).text()
let patches = 0

function patch(label: string, search: string, replacement: string, count = 1) {
  if (!code.includes(search)) {
    console.warn(`  WARN: patch "${label}" — pattern not found`)
    return
  }
  if (count === 0) {
    // Replace all
    const n = code.split(search).length - 1
    code = code.replaceAll(search, replacement)
    patches += n
  } else {
    for (let i = 0; i < count; i++) {
      code = code.replace(search, replacement)
    }
    patches += count
  }
  console.log(`  ✓ ${label}`)
}

// 1. Explicit onRender after initial updateContainerSync+flushSyncWork
//    React 19 canary's reconciler doesn't reliably call resetAfterCommit
patch(
  'Explicit onRender after initial render',
  'reconciler_default.updateContainerSync(tree, this.container, null, noop_default);\n    reconciler_default.flushSyncWork();',
  'reconciler_default.updateContainerSync(tree, this.container, null, noop_default);\n    reconciler_default.flushSyncWork();\n    if (this.rootNode.onComputeLayout) this.rootNode.onComputeLayout();\n    this.onRender();',
)

// 2. Explicit onRender after flushSyncFromReconciler
patch(
  'Explicit onRender after flushSyncFromReconciler',
  'reconciler_default.flushSyncFromReconciler();',
  'reconciler_default.flushSyncFromReconciler(); if (typeof this !== "undefined" && this && this.rootNode) { if (this.rootNode.onComputeLayout) this.rootNode.onComputeLayout(); this.onRender(); }',
  0, // replace all
)

// 3. Missing React 19 host config functions the reconciler destructures
const hostConfigAdditions = `
    suspendOnActiveViewTransition: () => {},
    resetFormInstance: () => {},
    applyViewTransitionName: () => {},
    restoreViewTransitionName: () => {},
    cancelViewTransitionName: () => {},
    cancelRootViewTransitionName: () => {},
    restoreRootViewTransitionName: () => {},
    getSuspendedCommitReason: () => null,
    maySuspendCommitOnUpdate: () => false,
    maySuspendCommitInSyncRender: () => false,
    startSuspendingCommit: () => null,
    suspendInstance: () => {},
    waitForCommitToBeReady: () => null,
    preloadInstance: () => true,
    maySuspendCommit: () => false,
    bindToConsole: (kind, fn, captureType) => fn,
    NotPendingTransition: null,
    HostTransitionContext: { $$typeof: Symbol.for("react.context"), _currentValue: null, _currentValue2: null, Provider: null, Consumer: null },`
patch(
  'Missing host config functions for React 19 reconciler',
  'supportsMutation: true,',
  'supportsMutation: true,' + hostConfigAdditions,
)

// 4. SDK shims double-initialization fix
//    The auto-shim runs at module init time, then a manual setShims call throws
patch(
  'SDK shims idempotent',
  'function setShims(shims, options = { auto: false }) {\n  if (auto) {',
  'function setShims(shims, options = { auto: false }) {\n  if (auto && !options.auto) { return; }\n  if (false && auto) {',
)

// 5. Periodic render polling — React 19's reconciler may not call resetAfterCommit
//    for state updates, so we poll to ensure the screen repaints
patch(
  'Periodic render polling (32ms)',
  'const deferredRender = () => queueMicrotask(this.onRender);',
  `const deferredRender = () => queueMicrotask(this.onRender);
    const _pollRender = () => { if (!this.isUnmounted) { this.onRender(); this._pollTimer = setTimeout(_pollRender, 32); } };
    this._pollTimer = setTimeout(_pollRender, 100);`,
)

// Clear poll timer on unmount
patch(
  'Clear poll timer on unmount',
  'this.isUnmounted = true;',
  'this.isUnmounted = true; if (this._pollTimer) clearTimeout(this._pollTimer);',
)

// 6. Patch resetAfterCommit to eagerly trigger layout+render
{
  const marker = 'clearContainer: () => false,'
  const target = 'resetAfterCommit(rootNode) {'
  const replacement = 'resetAfterCommit(rootNode) { if (typeof rootNode.onComputeLayout === "function") rootNode.onComputeLayout(); rootNode.onRender?.();'
  const idx = code.indexOf(marker)
  if (idx > 0) {
    const racIdx = code.indexOf(target, idx)
    if (racIdx > 0 && racIdx < idx + 5000) {
      code = code.slice(0, racIdx) + replacement + code.slice(racIdx + target.length)
      patches++
      console.log('  ✓ Eager resetAfterCommit')
    }
  }
}

// 7. LegacyRoot mode for synchronous updates
patch(
  'LegacyRoot mode',
  'this.container = reconciler_default.createContainer(this.rootNode, import_constants32.ConcurrentRoot,',
  'this.container = reconciler_default.createContainer(this.rootNode, 0 /* LegacyRoot */,',
)

// ─── Write final output ───

const shebang = '#!/usr/bin/env -S node --no-warnings=ExperimentalWarning --enable-source-maps\n'
await Bun.write(outPath, shebang + code)

const { chmod } = await import('fs/promises')
await chmod(outPath, 0o755)

console.log(`\nApplied ${patches} patches. Output: ${(Buffer.byteLength(shebang + code) / 1024 / 1024).toFixed(1)} MB`)
