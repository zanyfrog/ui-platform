import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (args, cwd = '.') => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }).trim();
const root = path.resolve('evidence/v1-stage5-implementation-20261105');
const final = JSON.parse(await fs.readFile(path.join(root, 'security-only/paths-and-inputs.json'), 'utf8')).target;
await fs.cp(path.join(final, 'diagnostics/stage5'), path.join(root, 'security-only/checks'), { recursive: true });
const accepted = JSON.parse(await fs.readFile('evidence/v1-stage4-isolation-20261105/preservation-after.json', 'utf8'));
const baselinePackages = JSON.parse(await fs.readFile('evidence/v1-stage4-isolation-20261105/package-closure.json', 'utf8'));
const packages = JSON.parse(await fs.readFile(path.join(root, 'package-closure.json'), 'utf8'));
const packageEqual = baselinePackages.length === packages.length && baselinePackages.every(a => packages.some(b => a.name === b.name && a.version === b.version && JSON.stringify(a.files) === JSON.stringify(b.files)));
const snapshots = await Promise.all(['preservation-after.json', 'security-only/preservation-after.json'].map(async name => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'))));
const sourceFiles = (await fs.readdir('src/server/production')).filter(f => f.endsWith('.ts') || f.startsWith('package')).map(f => 'src/server/production/' + f).concat(['src/shared/released-runtime-services.ts', 'tests/stage5-security.test.ts', 'tests/fixtures/stage5-process.ts']);
for (const file of sourceFiles) if (!(await fs.readFile(file)).equals(await fs.readFile(path.join(final, file)))) throw new Error('Tested source differs: ' + file);
const preservation = { platformHead: git(['rev-parse', 'HEAD']), uiBaseHead: git(['rev-parse', 'HEAD'], '../ui-base'), dataHead: git(['rev-parse', 'HEAD'], '../UI Platform Data Services'),
  uiBaseStatus: git(['status', '--porcelain'], '../ui-base'), dataStatus: git(['status', '--porcelain'], '../UI Platform Data Services'),
  trackedPlatformChanges: git(['diff', '--name-only']), rootManifestChanges: git(['diff', '56d835972a7a5cb32ea40e711e5a0fc9344b6794', '--', 'package.json', 'package-lock.json']),
  componentFilesMatchAcceptedStage4: snapshots.every(snapshot => JSON.stringify(snapshot.files) === JSON.stringify(accepted.files)),
  componentFileCount: Object.keys(accepted.files).length, packageClosureMatchesAcceptedStage4: packageEqual, admittedPackageFileCount: packages.reduce((n, item) => n + Object.keys(item.files).length, 0),
  finalSourceMatchesTestTarget: true, sourceFiles, sharedHistoricalLock: 'Unresolved accepted absence; no lock-file read, acquire, recover, replace or recreate',
  newPackages: JSON.parse(await fs.readFile('src/server/production/package-lock.json', 'utf8')).packages };
if (preservation.uiBaseStatus || preservation.dataStatus || preservation.rootManifestChanges || !packageEqual || !preservation.componentFilesMatchAcceptedStage4) throw new Error('Preservation discrepancy; stop');
await fs.writeFile(path.join(root, 'preservation-summary.json'), JSON.stringify(preservation, null, 2) + '\n');
const files = [...new Set([...git(['ls-files', '--others', '--exclude-standard']).split('\n'), ...git(['diff', '--name-only']).split('\n')])].filter(Boolean).filter(p => p !== 'evidence/v1-stage5-implementation-20261105/changed-file-hashes.json').sort();
const inventory = [];
for (const file of files) { const bytes = await fs.readFile(file); inventory.push({ path: file, bytes: bytes.length, sha256: sha(bytes) }); }
const output = JSON.stringify({ baseline: preservation.platformHead, inventoryExcludesItself: true, files: inventory }, null, 2) + '\n';
await fs.writeFile(path.join(root, 'changed-file-hashes.json'), output);
console.log(JSON.stringify({ changedFiles: inventory.length, inventorySha256: sha(output), preservation: { components: preservation.componentFileCount, admittedPackageFiles: preservation.admittedPackageFileCount, acceptedPackageClosureMatches: packageEqual } }));
