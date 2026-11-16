import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';

const platform = fileURLToPath(new URL('../', import.meta.url));
const data = path.resolve(platform, '../UI Platform Data Services');
const ormURL = pathToFileURL(path.join(data, 'packages/orm/dist/json-file-orm.js')).href;
const registryURL = pathToFileURL(path.join(data, 'packages/dataset-operations/dist/trigger-registry.js')).href;
const admissionFile = path.join(data, 'packages/dataset-operations/dist/trigger-admission.js');
const { JsonFileDatasetOrm } = await import(ormURL);
const { TriggerRegistry, registerTriggerDataset } = await import(registryURL);
const { TriggerConfigurationBoundary } = await import(pathToFileURL(admissionFile).href);
const ref = { appId: 'ui-platform', dataset: 'trigger_definitions' };
const definition = { id: 'fixture-trigger', appId: 'fixture-app', dataset: 'people', phase: 'afterCommit', enabled: true, handlerId: 'never-invoke', name: 'fixture' };
let output, AutomationStore, AutomationRuntime, storeURL;
before(async () => {
  output = await mkdtemp(path.join(tmpdir(), 'uip-trigger-admission-'));
  for (const name of ['automation-store', 'automation-runtime']) {
    await build({ entryPoints: [path.join(platform, `src/server/${name}.ts`)], outfile: path.join(output, `${name}.mjs`),
      bundle: true, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'current-admission', setup(builder) {
        builder.onResolve({ filter: /^@ui-platform\/dataset-operations$/ }, () => ({ path: pathToFileURL(admissionFile).href, external: true }));
        builder.onResolve({ filter: /^@/ }, args => ({ path: import.meta.resolve(args.path), external: true }));
      } }] });
  }
  storeURL = pathToFileURL(path.join(output, 'automation-store.mjs')).href;
  ({ AutomationStore } = await import(storeURL));
  ({ AutomationRuntime } = await import(pathToFileURL(path.join(output, 'automation-runtime.mjs')).href));
});
async function fixture() {
  const root = await mkdtemp(path.join(output, 'case-'));
  const orm = new JsonFileDatasetOrm(path.join(root, 'orm')); registerTriggerDataset(orm);
  const registry = new TriggerRegistry(orm);
  return { root, orm, registry };
}
async function child(code) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['--input-type=module', '--eval', code], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = ''; proc.stdout.on('data', x => stdout += x); proc.stderr.on('data', x => stderr += x);
    const timer = setTimeout(() => { proc.kill(); reject(new Error('child timeout')); }, 10000);
    proc.on('error', reject); proc.on('exit', status => { clearTimeout(timer); status === 0 ? resolve(stdout.trim()) : reject(new Error(stderr)); });
  });
}
const imports = `import { JsonFileDatasetOrm } from ${JSON.stringify(ormURL)}; import { TriggerRegistry, registerTriggerDataset } from ${JSON.stringify(registryURL)};`;
const openChild = root => `${imports} const orm = new JsonFileDatasetOrm(${JSON.stringify(path.join(root, 'orm'))}); registerTriggerDataset(orm); const registry = new TriggerRegistry(orm);`;
const expectCode = (code, error) => `${code}.then(() => { throw Error('unexpected success') }, e => { if (!e.message.includes(${JSON.stringify(error)})) throw e; console.log(e.message); });`;

test('cross-process registry create and raw ORM insert cannot activate during import', async () => {
  const { root, registry } = await fixture();
  await registry.withImportAdmission('fixture-app', 'people', async lease => {
    assert.match(await child(openChild(root) + expectCode(`registry.create(${JSON.stringify(definition)})`, 'ADMISSION_CLOSED')), /ADMISSION_CLOSED/);
    assert.match(await child(openChild(root) + `const tx=await orm.beginTransaction();` + expectCode(`orm.insert(${JSON.stringify(ref)}, [${JSON.stringify(definition)}], tx)`, 'ADMISSION_CLOSED')), /ADMISSION_CLOSED/);
    await lease.assertCurrent(); return { outcome: 'not-started', value: true };
  });
  await registry.create(definition);
  assert.equal((await registry.list('fixture-app')).length, 1);
});
test('registry update and raw ORM update/delete cannot bypass admission', async () => {
  const { root, registry } = await fixture(); await registry.create({ ...definition, enabled: false });
  await registry.withImportAdmission('fixture-app', 'people', async () => {
    for (const operation of ['update', 'delete']) {
      assert.match(await child(openChild(root) + 'const tx=await orm.beginTransaction();' + expectCode(`orm.${operation}(${JSON.stringify(ref)}, [${JSON.stringify(definition)}], tx)`, 'ADMISSION_CLOSED')), /ADMISSION_CLOSED/);
    }
    assert.match(await child(openChild(root) + expectCode(`registry.update('fixture-trigger', {enabled:true})`, 'ADMISSION_CLOSED')), /ADMISSION_CLOSED/);
    return { outcome: 'not-started', value: null };
  });
});
test('unenrolled ORM and direct persist reject trigger writes', async () => {
  const { root, orm } = await fixture();
  const other = new JsonFileDatasetOrm(path.join(root, 'orm')); registerTriggerDataset(other);
  await assert.rejects(other.insert(ref, [definition], await other.beginTransaction()), /ADMISSION_REQUIRED/);
  await assert.rejects(orm.persist('ui-platform__default__trigger_definitions', [definition]), /ADMISSION_REQUIRED/);
  await assert.rejects(orm.persist('./ui-platform__default__trigger_definitions', [definition]), /ADMISSION_REQUIRED/);
});
test('cached reads cannot hide independent activation, including afterCommit', async () => {
  const { root, registry } = await fixture(); assert.deepEqual(await registry.list('fixture-app'), []);
  await child(openChild(root) + `await registry.create(${JSON.stringify(definition)});`);
  assert.equal((await registry.list('fixture-app'))[0].enabled, true);
  await assert.rejects(registry.withImportAdmission('fixture-app', 'people', async () => { throw Error('must not run'); }), /IMPORT_ACTIVE_TRIGGERS/);
});
test('unsupported provider rejected without invoking provider or handlers', async () => {
  const { registry } = await fixture(); let called = false;
  registry.registerSourceProvider(async () => { called = true; throw Error('side effect'); });
  await assert.rejects(registry.withImportAdmission('fixture-app', 'people', async () => {}), /SOURCE_ADMISSION_UNSUPPORTED/);
  assert.equal(called, false);
});
test('Platform create/save/delete participate across processes; ordinary trigger execution preserved', async () => {
  const { root, registry } = await fixture();
  const triggerRoot = path.join(root, 'triggers');
  const store = new AutomationStore(triggerRoot, 'trigger');
  const input = { appId: 'fixture-app', datasetId: 'people-id', dataset: 'people', primaryKey: 'id', displayName: 'Fixture', enabled: false, phase: 'beforeInsert', actions: [] };
  const saved = await store.create('fixture', input);
  const runtime = new AutomationRuntime(store, new AutomationStore(path.join(root, 'workflows'), 'workflow'), new Map());
  runtime.connect(registry, async () => 'people');
  await registry.withImportAdmission('fixture-app', 'people', async lease => {
    const setup = `import { AutomationStore } from ${JSON.stringify(storeURL)}; const store = new AutomationStore(${JSON.stringify(triggerRoot)}, 'trigger');`;
    for (const op of [`store.create('another', ${JSON.stringify(input)})`, `store.save('fixture/trigger.json', ${JSON.stringify(saved.source)}, ${JSON.stringify(saved.hash)})`, `store.remove('fixture/trigger.json', ${JSON.stringify(saved.hash)}, [])`]) {
      assert.match(await child(setup + expectCode(op, 'ADMISSION_CLOSED')), /ADMISSION_CLOSED/);
    }
    await lease.assertCurrent(); return { outcome: 'not-started', value: true };
  });
  const updated = await store.save(saved.locator, saved.source.replace('"enabled": false', '"enabled": true'), saved.hash);
  assert.equal(updated.definition.enabled, true);
  const active = await registry.active('fixture-app', 'people', 'beforeInsert'); assert.equal(active.length, 1);
  assert.equal(typeof registry.handler(active[0].handlerId), 'function');
  await assert.rejects(registry.withImportAdmission('fixture-app', 'people', async () => {}), /IMPORT_ACTIVE_TRIGGERS/);
});
test('revision disagreement fails closed; source replacement forbidden during admission', async () => {
  const { root, registry } = await fixture(); let revision = 'one';
  registry.registerSourceProvider(async () => [], { boundary: new TriggerConfigurationBoundary(path.join(root, 'source')), snapshot: async () => ({ revision, triggers: [] }) });
  await assert.rejects(registry.withImportAdmission('fixture-app', 'people', async lease => {
    assert.throws(() => registry.registerSourceProvider(async () => []), /ADMISSION_HELD/);
    revision = 'two'; await lease.assertCurrent(); return { outcome: 'not-started', value: null };
  }), /CONFIGURATION_CONFLICT/);
  await assert.rejects(registry.create(definition), /ADMISSION_CLOSED/);
});
test('unknown commit outcome retains exclusion; ordinary Dataset CRUD remains functional', async () => {
  const { registry, orm } = await fixture();
  await assert.rejects(registry.withImportAdmission('fixture-app', 'people', async () => { throw Error('unknown commit'); }), /unknown commit/);
  await assert.rejects(registry.create(definition), /ADMISSION_CLOSED/);
  const ordinary = { appId: 'fixture-app', dataset: 'ordinary' }; orm.register({ reference: ordinary, primaryKey: 'id', fields: [{ name: 'id', type: 'string' }] });
  const tx = await orm.beginTransaction(); await orm.insert(ordinary, [{ id: 'one' }], tx); await tx.commit();
  assert.deepEqual(await orm.query({ resource: ordinary }), [{ id: 'one' }]);
});
test('process death retains durable configuration-writer claim', async () => {
  const { root, registry } = await fixture();
  await child(openChild(root) + 'await registry.configurationBoundary.enter(); process.exit(0);');
  const gate = await registry.configurationBoundary.prepare();
  assert.ok((await readdir(gate.directory)).some(x => x.startsWith('writer-')));
  let ran = false;
  await assert.rejects(gate.withCapture(async () => { ran = true; }, AbortSignal.timeout(100)), /abort|timeout/i);
  assert.equal(ran, false);
  await assert.rejects(registry.create(definition), /ADMISSION_CLOSED/);
});
test('import process death retains exclusive closure', async () => {
  const { root, registry } = await fixture();
  await child(openChild(root) + "await registry.withImportAdmission('fixture-app', 'people', async () => process.exit(0));");
  await assert.rejects(registry.create(definition), /ADMISSION_CLOSED/);
});
test('commit exception retains trigger-writer claim, rollback cannot silently clear it', async () => {
  const { orm, registry } = await fixture(); const tx = await orm.beginTransaction(); await orm.insert(ref, [definition], tx);
  orm.persist = async () => { throw Error('injected uncertain commit'); };
  await assert.rejects(tx.commit(), /uncertain commit/);
  await assert.rejects(tx.rollback(), /OUTCOME_UNKNOWN/);
  const gate = await registry.configurationBoundary.prepare(); assert.ok((await readdir(gate.directory)).some(x => x.startsWith('writer-')));
});
test('commit wrapper holds both boundaries through transaction completion', async () => {
  const { root, registry } = await fixture();
  const sourceRoot = path.join(root, 'platform');
  registry.registerSourceProvider(async () => [], { boundary: new TriggerConfigurationBoundary(sourceRoot), snapshot: async () => ({ revision: 'fresh', triggers: [] }) });
  const result = await registry.withImportAdmission('fixture-app', 'people', async lease => {
    await lease.commit({ async commit() {
      assert.match(await child(openChild(root) + expectCode(`registry.create(${JSON.stringify(definition)})`, 'ADMISSION_CLOSED')), /ADMISSION_CLOSED/);
      assert.match(await child(`import { TriggerConfigurationBoundary } from ${JSON.stringify(pathToFileURL(admissionFile).href)}; const boundary = new TriggerConfigurationBoundary(${JSON.stringify(sourceRoot)});` + expectCode('boundary.enter()', 'ADMISSION_CLOSED')), /ADMISSION_CLOSED/);
    } });
    return { outcome: 'committed', value: 'committed' };
  });
  assert.equal(result, 'committed'); await registry.create(definition);
});
test('caught commit error cannot be reclassified as rollback or retried', async () => {
  const { registry } = await fixture(); let attempts = 0;
  await assert.rejects(registry.withImportAdmission('fixture-app', 'people', async lease => {
    await assert.rejects(lease.commit({ async commit() { attempts++; throw Error('unknown'); } }), /unknown/);
    await assert.rejects(lease.commit({ async commit() { attempts++; } }), /ALREADY_ATTEMPTED/);
    return { outcome: 'rolled-back', value: null };
  }), /OUTCOME_UNKNOWN/);
  assert.equal(attempts, 1); await assert.rejects(registry.create(definition), /ADMISSION_CLOSED/);
});
test('normal eligibility rejection releases closure and allows disabling a trigger', async () => {
  const { registry } = await fixture(); await registry.create(definition);
  await assert.rejects(registry.withImportAdmission('fixture-app', 'people', async () => {}), /ACTIVE_TRIGGERS/);
  await registry.update(definition.id, { enabled: false });
  await registry.withImportAdmission('fixture-app', 'people', async () => ({ outcome: 'not-started', value: null }));
});
test('admission drains an existing writer and isolates unrelated environments', async () => {
  const { registry } = await fixture(); const other = await fixture();
  const release = await registry.configurationBoundary.enter(); let entered = false;
  const admission = registry.withImportAdmission('fixture-app', 'people', async () => { entered = true; return { outcome: 'not-started', value: true }; });
  // Wait for the exclusive closure, then prove it has not passed the existing claim.
  const gate = await registry.configurationBoundary.prepare();
  for (let i = 0; i < 100 && !(await readdir(gate.directory)).includes('closed'); i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(entered, false);
  await other.registry.create(definition); release(); assert.equal(await admission, true);
});
test('source-first and storage-first callers acquire shared boundaries in canonical order', async () => {
  const { withTriggerExclusion } = await import(pathToFileURL(admissionFile).href);
  const { root } = await fixture(); const a = new TriggerConfigurationBoundary(path.join(root, 'a')), z = new TriggerConfigurationBoundary(path.join(root, 'z'));
  const ordered = [];
  for (const boundary of [a, z]) { const exclude = boundary.exclude.bind(boundary); boundary.exclude = action => { ordered.push(boundary.root); return exclude(action); }; }
  await withTriggerExclusion([z, a, z], async () => {});
  assert.deepEqual(ordered, [a.root, z.root]);
});
test('another host cannot hide a declared source or register one during import', async () => {
  const { root, registry } = await fixture();
  await registry.withImportAdmission('fixture-app', 'people', async () => {
    assert.match(await child(openChild(root) + `try { registry.registerSourceProvider(async () => []); throw Error('unexpected success'); } catch(e) { if (!e.message.includes('ADMISSION_CLOSED')) throw e; console.log(e.message); }`), /ADMISSION_CLOSED/);
    return { outcome: 'not-started', value: null };
  });
  await child(openChild(root) + 'registry.registerSourceProvider(async () => []);');
  await assert.rejects(registry.withImportAdmission('fixture-app', 'people', async () => {}), /SOURCE_DECLARATION_MISMATCH/);
});
test('different declared source roots fail closed rather than accepting an incomplete source set', async () => {
  const { root, registry, orm } = await fixture();
  const other = new TriggerRegistry(orm);
  for (const [host, name] of [[registry, 'source-a'], [other, 'source-b']]) {
    host.registerSourceProvider(async () => [], { boundary: new TriggerConfigurationBoundary(path.join(root, name)), snapshot: async () => ({ revision: 'fresh', triggers: [] }) });
  }
  await assert.rejects(registry.withImportAdmission('fixture-app', 'people', async () => {}), /SOURCE_DECLARATION_MISMATCH/);
});
