import fs from 'node:fs/promises';
import path from 'node:path';

// Reuse the accepted Stage 4 physical preparation and preservation guard.
// Adapt only new evidence/test selection and make Data dependencies physical too.
const original = await fs.realpath('.');
const securityOnly = process.argv.includes('--security-only');
if (process.argv.slice(2).some(arg => arg !== '--security-only')) throw new Error('Only --security-only is supported');
process.argv = process.argv.filter(arg => arg !== '--security-only');
const source = await fs.readFile('scripts/verify-stage4-isolation.mjs', 'utf8');
const dataCopy = `const dataTarget = path.join(path.dirname(target), 'UI Platform Data Services');
await fs.mkdir(dataTarget, { recursive: true });
for (const name of ['packages', 'package.json', 'package-lock.json', 'tsconfig.base.json']) await fs.cp(path.resolve('../UI Platform Data Services', name), path.join(dataTarget, name), { recursive: true, filter: p => !p.split(path.sep).includes('node_modules') });
await fs.mkdir(path.join(dataTarget, 'node_modules'), { recursive: true });
for (const entry of await fs.readdir(path.resolve('../UI Platform Data Services/node_modules'), { withFileTypes: true })) {
  if (!entry.isDirectory() || ['.bin', '.vite'].includes(entry.name)) continue;
  if (entry.name === '@ui-platform') {
    await fs.mkdir(path.join(dataTarget, 'node_modules/@ui-platform'), { recursive: true });
    for (const name of await fs.readdir(path.resolve('../UI Platform Data Services/node_modules/@ui-platform'))) await fs.symlink(path.join(dataTarget, 'packages', name), path.join(dataTarget, 'node_modules/@ui-platform', name), 'junction');
  } else await fs.symlink(path.resolve('../UI Platform Data Services/node_modules', entry.name), path.join(dataTarget, 'node_modules', entry.name), 'junction');
}
for (const name of ['dataset-operations', 'i-am', 'versioned-definition-registry']) {
  const link = path.join(target, 'node_modules/@ui-platform', name);
  await fs.unlink(link); await fs.symlink(path.join(dataTarget, 'packages', name), link, 'junction');
}
await fs.cp(path.join(original, 'src/server/production/node_modules'), path.join(target, 'src/server/production/node_modules'), { recursive: true, dereference: true });
for (const relative of ['src/server/production/node_modules/openid-client', 'src/server/production/node_modules/jose', 'node_modules/@ui-platform/dataset-operations', 'node_modules/@ui-platform/i-am']) {
  const resolved = await fs.realpath(path.join(target, relative));
  if (!resolved.startsWith(path.dirname(target) + path.sep)) throw new Error('Unisolated security dependency: ' + relative);
}`;
const transformed = source
  .replaceAll('evidence/v1-stage4-isolation-20261105', 'evidence/v1-stage5-implementation-20261105' + (securityOnly ? '/security-only' : ''))
  .replace("await fs.symlink(path.resolve('../UI Platform Data Services'), path.join(path.dirname(target), 'UI Platform Data Services'), 'junction');", dataCopy)
  .replace("const tests = assetsOnly ? ['stage3-protected-upload', 'stage3-retained-presentation'] : ['stage4-role-administration', 'pilot-administration', 'v1-management-server', 'v1-management-routes', 'stage1-component-admission', 'stage1-component-release', 'stage1-component-pin', 'stage2-builder-authoring'];",
    securityOnly ? "const tests = ['stage5-security'];" : "const tests = ['stage5-security', 'stage4-role-administration', 'pilot-administration', 'v1-management-server', 'v1-management-routes', 'stage1-component-admission', 'stage1-component-release', 'stage1-component-pin', 'stage2-builder-authoring', 'stage3-protected-upload', 'stage3-retained-presentation'];")
  .replace("const roots = {};", "const roots = {};\nawait fs.writeFile(path.join(evidence, 'security-packages.json'), await fs.readFile(path.join(target, 'src/server/production/package-lock.json')));")
  .replace("for (const relative of ['evidence/v1-stage4-20261105'", "for (const relative of ['evidence/v1-stage5-local', 'evidence/v1-stage4-20261105'");
if (transformed === source || !transformed.includes(dataCopy) || !transformed.includes("'stage5-security'")) throw new Error('Stage 4 runner adaptation failed');
await import('data:text/javascript,' + encodeURIComponent(transformed));
