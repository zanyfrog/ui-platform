// Read only the exact ordinary repository implementation files named in accepted
// L3-B evidence. They are copied as inert disposable-test data, never imported.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const revise = process.argv.includes('--update-definition-projection');
const record = revise ? 'profile-projection' : 'profile-preparation';
const evidence = path.join(root, 'evidence/d6-p2-package-seals-20261026');
const accepted = JSON.parse(fs.readFileSync(path.join(root, 'evidence/builder-v1-wp5-f-l3b-20261024/native-admission-before-code.json')));
const graph = JSON.parse(fs.readFileSync(path.join(root, 'evidence/builder-v1-wp5-f-l3b-20261024/run-1792892810488/dependency-graphs.json')))['src/client/native-card-preview/frame.ts'].inputs;
const identities = JSON.parse(fs.readFileSync(path.join(root, 'evidence/builder-v1-wp5-f-l3b-20261024/run-1792892810488/bundle-identity.json')));
const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
const files = Object.entries(accepted.files).map(([file, value]) => ({ file, sha256: value.sha256 }));
for (const pkg of Object.values(accepted.packages)) files.push({ file: path.join(pkg.root, 'package.json'), sha256: pkg.sha256 });
files.push({ file: accepted.manifest.path, sha256: accepted.manifest.sha256 });
function id(file) {
  for (const [name, pkg] of Object.entries(accepted.packages)) {
    const relative = path.relative(pkg.root, file);
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) return name + '/' + relative.replaceAll('\\', '/');
  }
  throw Error('UNADMITTED_PROFILE_PATH');
}
const admitted = new Map(files.map(f => [path.resolve(f.file), id(f.file)]));
fs.writeFileSync(path.join(evidence, record + '-admission.json'), JSON.stringify({ files, execution: 'Node builtins only; no native module or product imported; exact ordinary source bytes become inert test data; hashes must match historical admission', noInstalledSourceReads: true }, null, 2));
const directory = path.join(root, 'tests/d6-p2/bytes'); fs.mkdirSync(directory, { recursive: true });
const resources = files.map(f => {
  const bytes = fs.readFileSync(f.file); assert.equal(hash(bytes), f.sha256, 'ACCEPTED_ORDINARY_SOURCE_CHANGED ' + f.file);
  const fixture = path.join(directory, f.sha256 + '.txt');
  if (revise) assert.deepEqual(fs.readFileSync(fixture), bytes); else fs.writeFileSync(fixture, bytes, { flag: 'wx' });
  const input = Object.entries(graph).find(([key]) => path.resolve(root, key) === path.resolve(f.file))?.[1];
  const dependencies = (input?.imports ?? []).filter(i => i.path !== '<runtime>').map(i => {
    assert.ok(!i.external, 'UNSUPPORTED_EXTERNAL_IMPORT');
    const target = admitted.get(path.resolve(root, i.path)); assert.ok(target, 'UNADMITTED_STATIC_EDGE'); return target;
  });
  return { id: id(f.file), sha256: f.sha256, byteLength: bytes.length, mediaType: f.file.endsWith('.json') ? 'application/json' : 'text/javascript', dependencies: [...new Set(dependencies)].sort() };
}).sort((a,b) => a.id.localeCompare(b.id));
const definitions = JSON.parse(fs.readFileSync(accepted.manifest.path)).components.filter(d => d.identity?.componentId === accepted.manifest.definitionId);
assert.equal(definitions.length, 1); const definition = definitions[0];
assert.equal('sha256:' + hash(canonical(definition)), identities.definitionDigest);
const definitionBinding = { schemaVersion: definition.schemaVersion, ownership: definition.ownership, version: definition.version, implementation: definition.implementation };
const profile = { schema: 'native-card-owner-profile-v1', componentId: accepted.manifest.definitionId, packageId: '@ui-base/ui', packageVersion: '0.5.1', definitionRevision: null, definitionDigest: identities.definitionDigest, definitionBinding, nativeAdmissionClosureDigest: identities.closureDigest, exports: { card: './src/layout/uib-card.js', renderer: './src/platform/renderer.js', registry: './src/platform/registry.js' }, resources };
const revision = hash(canonical(profile));
const output = `// Exact accepted native Card implementation profile; source bytes are never executed here.\nexport const nativeCardPublicationProfile = ${JSON.stringify(profile, null, 2)} as const;\nexport const nativeCardPublicationRevision = '${revision}';\n`;
fs.writeFileSync(path.join(root, 'src/server/package-publication-profile.ts'), output, { flag: revise ? 'w' : 'wx' });
fs.writeFileSync(path.join(evidence, record + '-result.json'), JSON.stringify({ resources: resources.length, revision, identities, fixtureData: resources.map(r => ({ id: r.id, file: 'tests/d6-p2/bytes/' + r.sha256 + '.txt', sha256: r.sha256 })) }, null, 2));
console.log('Prepared pinned profile and ' + resources.length + ' inert fixture members');
