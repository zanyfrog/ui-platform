import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/assets/', import.meta.url));
const files = (await readdir(root)).filter(file => file.endsWith('.js'));
assert.ok(files.length, 'Build the production client before checking editor exclusion.');
for (const file of files) {
  const text = await readFile(path.join(root, file), 'utf8');
  for (const marker of ['Development identity', 'uib-editor-identity-change', '/api/editor/session', 'x-editor-revision', 'dev-admin', 'admin@uib.test', 'Generic Artifact Editor', 'Authorize and compare for recovery', 'Descriptor-driven properties']) {
    assert.ok(!text.includes(marker), `${file} contains development editor machinery: ${marker}`);
  }
}
console.log('Production client contains no fixture selector, session client or editor transport.');
