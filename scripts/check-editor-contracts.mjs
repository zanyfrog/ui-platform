import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = relative => JSON.parse(readFileSync(new URL(relative, new URL('../', import.meta.url)), 'utf8'));
const consumer = readJson('package.json');
const foundation = readJson('packages/artifacts/package.json');
const lock = readJson('package-lock.json');
assert.equal(consumer.dependencies['@ui-platform/artifacts'], '0.1.0', 'Review Foundation compatibility before changing its exact pin.');
assert.equal(foundation.version, '0.1.0');
assert.equal(lock.packages[''].dependencies['@ui-platform/artifacts'], '0.1.0');
assert.equal(lock.packages['packages/artifacts'].version, '0.1.0');

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Build first: consumers must resolve package exports to emitted JS/declarations.
run('node_modules/typescript/bin/tsc', ['-p', 'packages/artifacts/tsconfig.build.json']);
run('node_modules/typescript/bin/tsc', ['-p', 'tsconfig.editor-contracts.json']);
run('scripts/document-artifact-contracts.mjs', ['--check']);
run('node_modules/vitest/vitest.mjs', ['run',
  'packages/artifacts/tests/editor-package-contract.test.ts',
  'packages/artifacts/tests/consumer-contract.test.ts',
  'packages/artifacts/tests/schema-adapter-compatibility.test.ts',
  'packages/artifacts/tests/windows-storage.test.ts',
  'packages/artifacts/tests/watcher.test.ts',
  'packages/artifacts/tests/watcher-fallback.test.ts',
  'tests/artifact-editor.test.ts',
  'tests/artifact-watcher.test.ts',
  'tests/editor-security.test.ts',
  'tests/editor-security-client.test.ts',
  'tests/editor-security-server.test.ts',
  'tests/editor-context.test.ts',
  'tests/editor-properties.test.ts',
]);
