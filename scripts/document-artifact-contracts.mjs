import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
// Resolve the artifact package's compiler API, not the root CLI-only TypeScript installation.
const ts = createRequire(new URL('../packages/artifacts/package.json', import.meta.url))('typescript');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'packages/artifacts/dist');
const document = path.join(root, 'docs/architecture/generic-artifact-editor-readiness.md');
const sections = [['types.d.ts'], ['artifact-service.d.ts', 'ArtifactServiceOptions'], ['definitions.d.ts', 'ArtifactDefinitionRegistry'], ['validation/validator-registry.d.ts', 'ValidatorRegistry', 'validateValue'], ['validation/artifact-validation-error.d.ts', 'ArtifactValidationError']];
const declarations = [];
for (const [file, ...names] of sections) {
  const text = await readFile(path.join(dist, file), 'utf8');
  if (!names.length) { declarations.push(text.trim()); continue; }
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  for (const name of names) {
    const declaration = source.statements.find(node => node.name?.getText(source) === name);
    if (!declaration) throw new Error(`Export declaration missing: ${name}`);
    declarations.push(declaration.getText(source));
  }
}
const current = await readFile(document, 'utf8');
const start = '<!-- artifact-contracts:start -->', end = '<!-- artifact-contracts:end -->';
const first = current.indexOf(start), last = current.indexOf(end);
if (first < 0 || last <= first) throw new Error('Contract documentation markers are missing.');
const next = current.slice(0, first + start.length) + '\n\n```ts\n' + declarations.join('\n\n') + '\n```\n\n' + current.slice(last);
if (process.argv.includes('--check')) {
  if (current !== next) throw new Error('Artifact contract documentation differs from the built declarations.');
} else await writeFile(document, next);
