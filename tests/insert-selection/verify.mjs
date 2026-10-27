// Actual renderList declaration in a DOM; no backend, store or identity imports.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'evidence/v1-insert-selection-20261027');
const require = createRequire(path.join(root, 'packages/artifacts/package.json'));
const ts = require('typescript');
const { Window } = createRequire(path.resolve(root, '../ui-base/package.json'))('happy-dom');
const file = path.join(root, 'src/client/visual-artifacts/editor.ts');
const source = fs.readFileSync(file, 'utf8');
const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
let declaration;
function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'renderList') declaration = node.getText(parsed); else ts.forEachChild(node, visit); }
visit(parsed); assert.ok(declaration);
const emitted = ts.transpileModule(declaration, { compilerOptions: { target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
assert.equal(emitted.diagnostics.length, 0);
fs.writeFileSync(path.join(out, 'renderList-executed.js'), emitted.outputText);
const window = new Window();
window.document.body.innerHTML = '<button data-create="shell"></button><select data-artifacts></select><select data-insert></select>';
const find = selector => window.document.querySelector(selector);
const workspace = { pages: [], shells: [], components: [], packages: [{ id: 'card', name: 'Card' }, { id: 'panel', name: 'Panel' }] };
const render = new Function('find', 'workspace', 'selected', 'esc', emitted.outputText + ';return renderList;')(find, workspace, null, value => String(value));
try {
  render(); assert.equal(find('[data-insert]').value, 'html:section');
  for (const value of ['package:card', 'package:panel', 'html:div']) {
    find('[data-insert]').value = value;
    for (let i = 0; i < 3; i++) { render(); assert.equal(find('[data-insert]').value, value); }
  }
  find('[data-insert]').value = 'package:card';
  workspace.packages[0].activationIssues = ['unavailable'];
  render(); assert.equal(find('[data-insert]').value, 'html:section');
  fs.writeFileSync(path.join(out, 'selection-test.json'), JSON.stringify({ passed: true, actualDeclaration: 'renderList', cases: ['initial default', 'Card across repeated refresh', 'Panel across repeated refresh', 'HTML across repeated refresh', 'unavailable selection falls back'], sourceSha256: createHash('sha256').update(source).digest('hex'), backendExecuted: false, normalBrowserVerified: false }, null, 2));
  console.log('PASS insertion selection regression');
} finally { await window.happyDOM.close(); }
