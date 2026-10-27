import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export function checkSources(root, ts) {
  const evidence = path.join(root, 'evidence/v1-recovery-free-workspace-20261026');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
  const before = file => fs.readFileSync(path.join(evidence, file.replaceAll('/', '-') + '.before.txt'), 'utf8').replaceAll('\r\n', '\n');
  const file = 'src/server/index.ts', actual = read(file);
  const expected = before(file)
    .replace('return json(res, 200, await withApplicationMutation(appPath(key), async () => visualWorkspace(key, await discoverComponents(key))));', "const readOptions = { recovery: 'refuse' as const, signal: acquisition.signal };\n          return json(res, 200, await withApplicationMutation(appPath(key), async () => visualWorkspace(key, await discoverComponents(key), readOptions), readOptions));")
    .replace("            }));\n          }\n          const bundle = locator ? await service.read(locator) : null;", "            }, { recovery: 'refuse', signal: acquisition.signal }));\n          }\n          const readOptions = { recovery: 'refuse' as const, signal: acquisition.signal };\n          const bundle = locator ? await service.read(locator, readOptions) : null;")
    .replace('return json(res, 200, bundle ?? await service.list());', 'return json(res, 200, bundle ?? await service.list(readOptions));');
  assert.equal(actual, expected, 'Only the three Visual GET branches may change; authorization/owner/mutation/error mapping must be byte-equivalent');
  assert.ok(actual.includes("failure.code === 'source.recovery-required'"));
  assert.equal(read('src/server/composition-lock.ts'), before('src/server/composition-lock.ts'), 'Graph/request wrapper remains unchanged');
  const ast = text => ts.createSourceFile('source.ts', text, ts.ScriptTarget.Latest, true);
  for (const name of ['index', 'visual-artifacts', 'application-composition', 'visual-preview', 'composition-lock']) assert.equal(ast(read(`src/server/${name}.ts`)).parseDiagnostics.length, 0);
  const declarations = (text, exclude) => {
    const result = [];
    function visit(node) {
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        if (!exclude.includes(node.name?.getText())) result.push(node.getText());
      } else ts.forEachChild(node, visit);
    }
    visit(ast(text)); return result;
  };
  for (const [name, exclude] of [['visual-artifacts', ['list', 'visualWorkspace']], ['application-composition', ['compositionWorkspace']]]) {
    const file = `src/server/${name}.ts`;
    assert.deepEqual(declarations(read(file), exclude), declarations(before(file), exclude), 'Unrelated functions/mutations remain exact: ' + name);
  }
  // Every acquisition in these collectors and the two Preview captures carries
  // the snapshotted options; mutation callers retain their default options.
  const preview = read('src/server/visual-preview.ts');
  assert.equal((preview.match(/visualWorkspace\(key, packages, options\)/g) ?? []).length, 2);
  assert.equal((preview.match(/compositionWorkspace\(key, packages, undefined, options\)/g) ?? []).length, 2);
  assert.ok(preview.includes('}, options);'));
  const workspace = read('src/server/visual-artifacts.ts').split('export async function visualWorkspace')[1].split('export async function knownVisualArtifacts')[0];
  assert.equal((workspace.match(/\.list\(options\)/g) ?? []).length, 3);
  const composition = read('src/server/application-composition.ts').split('export async function compositionWorkspace')[1].split('export async function compositionSourcePath')[0];
  assert.equal((composition.match(/\.list\(options\)/g) ?? []).length, 3);
  return { passed: true, backendExecuted: false, routeCheck: 'Exact allowed GET-only replacements; original authorization, ownership, saved hash checks, mutation bodies and error mapping unchanged', declarations: 'All noncollector service/composition methods unchanged', collectors: 'Explicit forwarding to all three lists and both Preview captures/composition rechecks', indexTypecheck: 'Syntax and exact route edits; no whole-backend typecheck or initialization' };
}
