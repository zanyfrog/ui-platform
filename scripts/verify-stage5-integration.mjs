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
  .replace('/initial-preparation-failure/\\n', '/initial-preparation-failure/\\n/security-only/\\n/v1-stage5-integration-local/\\n')
  .replaceAll('evidence/v1-stage4-isolation-20261105', 'evidence/v1-stage5-wp3-integration-20261105' + (securityOnly ? '/security-only' : ''))
  .replace("await fs.symlink(path.resolve('../UI Platform Data Services'), path.join(path.dirname(target), 'UI Platform Data Services'), 'junction');", dataCopy)
  .replace("const tests = assetsOnly ? ['stage3-protected-upload', 'stage3-retained-presentation'] : ['stage4-role-administration', 'pilot-administration', 'v1-management-server', 'v1-management-routes', 'stage1-component-admission', 'stage1-component-release', 'stage1-component-pin', 'stage2-builder-authoring'];",
    securityOnly ? "const tests = ['stage5-integration'];" : "const tests = ['stage5-integration', 'stage5-predicate-contract', 'stage5-security', 'stage4-role-administration', 'pilot-administration', 'v1-management-server', 'v1-management-routes', 'stage1-component-admission', 'stage1-component-release', 'stage1-component-pin', 'stage2-builder-authoring', 'stage3-protected-upload', 'stage3-retained-presentation'];")
  .replace("const roots = {};", "const roots = {};\nawait fs.writeFile(path.join(evidence, 'security-packages.json'), await fs.readFile(path.join(target, 'src/server/production/package-lock.json')));")
  .replace('const tests =', `const {spawnSync}=await import('node:child_process');
const dataRoot=path.join(path.dirname(target),'UI Platform Data Services');
const runSources={};
const productionSources=(await fs.readdir(path.join(original,'src/server/production'))).filter(n=>n.endsWith('.ts')).map(n=>'src/server/production/'+n);
for(const relative of [...productionSources,'src/shared/released-runtime-services.ts','src/server/role-administration.ts','packages/visual-artifacts/src/runtime.ts','tests/stage5-integration.test.ts','tests/stage5-predicate-contract.test.ts','tests/fixtures/stage5-integration-process.ts','tests/fixtures/stage5-integration-journey.ts']){const a=await fs.readFile(path.join(original,relative)),b=await fs.readFile(path.join(target,relative));if(!a.equals(b))throw new Error('UI source copy mismatch: '+relative);runSources['UI Platform/'+relative]=createHash('sha256').update(b).digest('hex');}
for(const relative of ['packages/i-am/src/wp3/types.ts','packages/i-am/src/wp3/graph.ts','packages/i-am/src/wp3/service.ts','packages/i-am/tests/wp3-template-contract.test.ts']){const a=await fs.readFile(path.resolve('../UI Platform Data Services',relative)),b=await fs.readFile(path.join(dataRoot,relative));if(!a.equals(b))throw new Error('Data source copy mismatch: '+relative);runSources['Data Services/'+relative]=createHash('sha256').update(b).digest('hex');}
await fs.writeFile(path.join(evidence,'run-source-inputs.json'),JSON.stringify(runSources,null,2));
const dataBuild=spawnSync(process.execPath,[path.join(dataRoot,'node_modules/typescript/bin/tsc'),'-p',path.join(dataRoot,'packages/i-am/tsconfig.json')],{cwd:dataRoot,encoding:'utf8',windowsHide:true});
await fs.writeFile(path.join(evidence,'wp3-build.txt'),dataBuild.stdout+dataBuild.stderr);
if(dataBuild.status!==0)throw new Error('Isolated WP3 build failed');
const dataTests=spawnSync(process.execPath,[path.join(dataRoot,'node_modules/vitest/vitest.mjs'),'run',...${JSON.stringify(securityOnly?['packages/i-am/tests/wp3-template-contract.test.ts','packages/i-am/tests/wp3-administration.test.ts']:['packages/i-am/tests'])},'--reporter=default','--reporter=json','--outputFile='+path.join(evidence,'wp3-results.json')],{cwd:dataRoot,encoding:'utf8',windowsHide:true,env:{...process.env,UI_PLATFORM_DATA_PHYSICAL_ROOT:dataRoot,UI_PLATFORM_DATA_ORIGINAL_ROOT:path.resolve('../UI Platform Data Services')}});
await fs.writeFile(path.join(evidence,'wp3-tests.txt'),dataTests.stdout+dataTests.stderr);
if(dataTests.status!==0)throw new Error('Isolated WP3 focused/compatibility tests failed; browser journey was not started');
await fs.copyFile(path.join(dataRoot,'wp3-template-observations.json'),path.join(evidence,'wp3-activation-observations.json'));
const compiled=spawnSync(process.execPath,[path.resolve('node_modules/typescript/bin/tsc'),'-p',path.join(target,'packages/visual-artifacts/tsconfig.json')],{cwd:target,encoding:'utf8',windowsHide:true});
await fs.writeFile(path.join(evidence,'visual-build.txt'),compiled.stdout+compiled.stderr);
if(compiled.status!==0)throw new Error('Isolated visual package compilation failed; see visual-build.txt');
const tests =`)
  .replace("for (const relative of ['evidence/v1-stage4-20261105'", "for (const relative of ['evidence/v1-stage5-integration-local', 'evidence/v1-stage5-local', 'evidence/v1-stage4-20261105'");
if (transformed === source || !transformed.includes(dataCopy) || !transformed.includes("'stage5-integration'")) throw new Error('Stage 4 runner adaptation failed');
await import('data:text/javascript,' + encodeURIComponent(transformed));
