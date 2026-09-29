const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const p = path.resolve(__dirname, '../../../..');
const d = path.resolve(p, '../UI Platform Data Services');
const npm = 'C:/Users/zanyf/AppData/Local/Temp/ds0-stab0-npm-10.8.2/package/bin/npm-cli.js';
const env = { ...process.env, PATH: path.resolve(path.dirname(npm),'../../shims') + path.delimiter + process.env.PATH };
env.NODE_OPTIONS = ((process.env.NODE_OPTIONS || '') + ' --require=' + path.join(__dirname,'trace-npm.cjs').replaceAll('\\','/')).trim();
const strict = ['--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext'];
const runs = [
  ['07-build', d, npm, 'run', 'build'],
  ['08-typecheck', d, npm, 'run', 'typecheck'],
  ['09-strict', d, 'node_modules/typescript/bin/tsc', ...strict,
    'packages/dataset-operations/tests/activation-http.test.ts', 'packages/dataset-operations/tests/activation-process.test.ts', 'packages/dataset-operations/tests/activation-drain.test.ts', 'packages/schema-application/tests/verification.test.ts', 'packages/schema-application/tests/fingerprint.test.ts',
    'packages/schema-application/tests/resolver.test.ts', 'packages/schema-application/tests/r1-consumer-fixture.ts',
    'packages/dataset-operations/tests/operation-security.test.ts', 'packages/i-am/tests/write-scope-containment.test.ts',
    'packages/dataset-operations/tests/result-consumer-fixture.ts'],
  ['10-full-tests', d, 'node_modules/vitest/vitest.mjs', 'run'],
  ['11-platform-focused', p, 'node_modules/vitest/vitest.mjs', 'run',
    'packages/artifacts/tests/schema-adapter-compatibility.test.ts', 'packages/artifacts/tests/migrations-deployment.test.ts'],
  ['12-platform-typecheck', p, npm, 'run', 'typecheck'],
  ['13-platform-production', p, npm, 'run', 'check:editor-production'],
  ['14-platform-contracts', p, npm, 'run', 'check:editor-contracts'],
];
const results = [];
for (const [name, cwd, ...args] of runs) {
  console.log('Running ' + name);
  const start = new Date().toISOString();
  const result = cp.spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(__dirname, name + '.txt'), 'Command: node ' + args.join(' ') + '\nCWD: ' + cwd + '\nStart: ' + start + '\nExit: ' + result.status + '\n' + (result.stdout || '') + (result.stderr || '') + (result.error ? String(result.error) : ''));
  results.push({ name, cwd, executable: process.execPath, args, start, end: new Date().toISOString(), exit: result.status, error: result.error?.message });
  fs.writeFileSync(path.join(__dirname, 'commands.json'), JSON.stringify({ node: process.version, npm: cp.execFileSync(process.execPath, [npm, '--version'], { env, encoding:'utf8' }).trim(), npmPath: npm, results }, null, 2) + '\n');
  console.log(name + ': exit ' + result.status);
  if (result.status !== 0) process.exitCode = 1;
}
