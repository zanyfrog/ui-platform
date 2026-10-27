import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export function checkLayoutCss(root, ts) {
  const source = fs.readFileSync(path.join(root, 'packages/visual-artifacts/src/runtime.ts'), 'utf8');
  const parsed = ts.createSourceFile('runtime.ts', source, ts.ScriptTarget.Latest, true);
  const styles = parsed.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(parsed) === 'styles'));
  const layout = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'layoutCss');
  assert.ok(styles && layout);
  // Execute the exact pure declarations, excluding native-registration imports.
  // Actual full runtime/native rendering is exercised by the DOM/browser tests.
  const emitted = ts.transpileModule(styles.getText(parsed) + '\n' + layout.getText(parsed), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  const layoutCss = new Function(emitted.outputText.replace('export function', 'function') + ';return layoutCss;')();
  const css = layoutCss({ container: { base: { display: 'flex', justifyContent: 'center', padding: '24px' } }, child: { base: { width: '480px' }, tablet: { width: '360px' }, mobile: { width: '100%' } } });
  assert.ok(css.includes('display:flex;justify-content:center;padding:24px'));
  assert.ok(css.includes('[data-uip-node="child"]{width:480px}'));
  assert.ok(css.includes('@media(max-width:1023px){[data-uip-node="child"]{width:360px}}'));
  assert.ok(css.includes('@media(max-width:639px){[data-uip-node="child"]{width:100%}}'));
  assert.throws(() => layoutCss({ child: { base: { width: '10px;position:absolute' } } }), /Unsupported declarative layout/);
  assert.throws(() => layoutCss({ child: { base: { position: 'absolute' } } }), /Unsupported declarative layout/);
  return { passed: true, cases: ['base container/child CSS', 'existing tablet/mobile media rules', 'unsafe value refusal', 'unsupported property refusal'], execution: 'Exact pure styles/layoutCss declarations; no alternate implementation or native initialization', generatedCss: css };
}
