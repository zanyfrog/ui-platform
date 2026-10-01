// Documentation/proposal checks only; never modifies production sources or state.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'docs/architecture/evidence/iam-0/source-inventory.json'), 'utf8'));
const sourceChecks = inventory.sourceFiles.map(entry => {
  const p = path.join(inventory.roots[entry.repository], entry.path);
  return { path: p, matches: sha(p).toUpperCase() === entry.sha256.toUpperCase() };
});
const relativeFiles = [
  'docs/architecture/iam-wp0-contract-reconciliation.md',
  'docs/architecture/iam-wp0/contracts.proposed.ts',
  'docs/architecture/iam-wp0/file-formats.md',
  'docs/architecture/iam-wp0/migration-plan.md',
  'docs/architecture/iam-wp0/acceptance-matrix.md',
];
const documentChecks = [];
let jsonExamples = 0;
const brokenLinks = [];
for (const relative of relativeFiles) {
  const p = path.join(root, relative);
  const content = fs.readFileSync(p, 'utf8');
  documentChecks.push({ path: relative, sha256: sha(p) });
  if (!p.endsWith('.md')) continue;
  for (const match of content.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)) {
    JSON.parse(match[1]); jsonExamples++;
  }
  for (const match of content.matchAll(/\]\((?:<([^>]+)>|([^\s)]+))\)/g)) {
    const target = (match[1] ?? match[2]).replace(/#.*$/, '');
    if (!target || /^https?:/.test(target)) continue;
    const resolved = path.resolve(path.dirname(p), target);
    if (resolved === path.join(here, 'verification.json')) continue; // Generated below.
    if (!fs.existsSync(resolved)) brokenLinks.push({ source: relative, target });
  }
}
const compilerArgs = ['node_modules/typescript/bin/tsc', '--ignoreConfig', '--noEmit', '--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'Bundler', 'docs/architecture/iam-wp0/contracts.proposed.ts'];
const compilation = spawnSync(process.execPath, compilerArgs, { cwd: root, encoding: 'utf8' });
const matrix = fs.readFileSync(path.join(root, relativeFiles[4]), 'utf8');
const cases = [...matrix.matchAll(/^\| (W\d-\d+) \|/gm)].map(m => m[1]);
const gaps = [...matrix.matchAll(/^\| (IAM-\d+) /gm)].map(m => m[1]);
const result = {
  review: 'WP0 accepted with D1-D7, D6 recovery clarification, and Blueprint ownership amendment; WP1 authorized separately',
  capturedUtc: new Date().toISOString(),
  baseline: { platform: inventory.heads.platform, dataServices: inventory.heads.dataServices },
  architecture: { path: 'C:/Users/zanyf/Downloads/ui-platform-i-am-architecture-and-implementation-waypoints.md', sha256: sha('C:/Users/zanyf/Downloads/ui-platform-i-am-architecture-and-implementation-waypoints.md') },
  sourcePreservation: { checked: sourceChecks.length, mismatches: sourceChecks.filter(x => !x.matches) },
  documents: documentChecks,
  jsonExamplesParsed: jsonExamples,
  brokenLinks,
  proposalCompilation: { command: ['node', ...compilerArgs].join(' '), exitCode: compilation.status, output: `${compilation.stdout ?? ''}${compilation.stderr ?? ''}`, error: compilation.error?.message },
  plannedAcceptanceCases: cases.length,
  duplicateAcceptanceIds: cases.filter((id, i) => cases.indexOf(id) !== i),
  iam0GapsMapped: gaps,
  runtimeTestsExecuted: false,
  productionImplementationChanges: false,
  notes: [
    'First compiler invocation required --ignoreConfig for the installed TypeScript; corrected command recorded here.',
    'JSON parsing establishes example syntax only, not implementation of proposed semantic validation.',
    'Proposal strict compilation is self-contained, not proof of old/new package integration.',
    'IAM-0 report/evidence were already untracked at start and are preserved.',
    'No runtime, deployment, provider, credentials, migrations or policy activation exercised.',
  ],
};
fs.writeFileSync(path.join(here, 'verification.json'), `${JSON.stringify(result, null, 2)}\n`);
const ok = sourceChecks.every(x => x.matches) && !brokenLinks.length && compilation.status === 0 && !result.duplicateAcceptanceIds.length && gaps.length === 17;
console.log(JSON.stringify({ ok, sourceFilesChecked: sourceChecks.length, jsonExamples, brokenLinks, compilationExit: compilation.status, plannedAcceptanceCases: cases.length, gapsMapped: gaps.length }));
if (!ok) process.exitCode = 1;
