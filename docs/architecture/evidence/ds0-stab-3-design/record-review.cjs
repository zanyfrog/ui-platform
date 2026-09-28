// Read-only repository review; writes only this review's evidence JSON.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const p = 'C:/Projects/Modular/ui-platform';
const d = 'C:/Projects/Modular/UI Platform Data Services';
const b = 'C:/Projects/Modular/ui-base';
const git = (root, ...args) => cp.execFileSync('git', ['-c', `safe.directory=${root}`, '-C', root, ...args], { encoding: 'utf8' }).trim();
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const baseline = JSON.parse(fs.readFileSync(path.join(p, 'docs/architecture/evidence/ds0-stab-2-implementation/preservation.json')));
const testedFiles = baseline.changedFiles.map(x => ({ ...x, currentSha256: hash(path.join(d, x.path)), matches: hash(path.join(d, x.path)) === x.sha256 }));
const committedFiles = git(d, 'diff', '--name-only', '577683840535e668c2000f24562702e7b51c6a0b', 'HEAD').split('\n').sort();
const expectedFiles = baseline.changedFiles.map(x => x.path).sort();
if (testedFiles.some(x => !x.matches) || JSON.stringify(committedFiles) !== JSON.stringify(expectedFiles)) throw new Error('Accepted STAB-2 scope/hash mismatch');
const preserved = ['docs/architecture/ds0-stab-2-implementation-acceptance-report.md', ...fs.readdirSync(path.join(p, 'docs/architecture/evidence/ds0-stab-2-implementation')).map(x => 'docs/architecture/evidence/ds0-stab-2-implementation/' + x)].map(file => ({ path: file, sha256: hash(path.join(p, file)) }));
const result = {
  recordedAt: new Date().toISOString(),
  activity: 'Read-only STAB-2 commit review and STAB-3 design baseline; no tests rerun or runtime edits',
  repositories: [d, p, b].map(root => ({ path: root, head: git(root, 'rev-parse', 'HEAD'), branch: git(root, 'branch', '--show-current'), status: git(root, 'status', '--short'), lockfileSha256: hash(path.join(root, 'package-lock.json')) })),
  acceptedSourceParent: '577683840535e668c2000f24562702e7b51c6a0b',
  existingCommit: git(d, 'show', '-s', '--format=fuller', 'HEAD'),
  committedFiles, testedFiles,
  diffCheck: git(d, 'diff', '--check', '577683840535e668c2000f24562702e7b51c6a0b', 'HEAD'),
  protectedOutsideDoeChanges: git(d, 'diff', '--name-only', '577683840535e668c2000f24562702e7b51c6a0b', 'HEAD', '--', '.', ':!packages/dataset-operations'),
  acceptedEvidenceWorkingTreeDiff: git(p, 'diff', 'HEAD', '--', ...preserved.map(x => x.path)),
  preserved,
  designSourceHashes: ['packages/dataset-operations/src/operation-manager.ts', 'packages/dataset-operations/src/types.ts', 'packages/dataset-operations/src/request-handler.ts', 'packages/dataset-operations/src/trigger-registry.ts', 'packages/i-am/src/authorization-service.ts', 'packages/i-am/src/policy-store.ts', 'packages/i-am/src/types.ts', 'packages/i-am/src/service.ts', 'packages/orm/src/json-file-orm.ts'].map(file => ({ path: file, sha256: hash(path.join(d, file)) }))
};
fs.writeFileSync(path.join(__dirname, 'review.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ head: result.repositories[0].head, testedFiles: testedFiles.length, mismatches: testedFiles.filter(x => !x.matches).length, committedFiles: committedFiles.length, preservedEvidenceFiles: preserved.length, outsideDoe: result.protectedOutsideDoeChanges, diffCheck: result.diffCheck }));
