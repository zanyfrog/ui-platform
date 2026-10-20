import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { readRoleBundle, saveRoleBundle, RoleBundleRecoveryRequiredError, type RoleBundleLocation } from '../src/role-bundle.js';
import { ArtifactConflictError, ArtifactOwnerUnresolvedError, storageKey } from '../src/storage.js';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
const roles = ['page.html', 'page.css', 'page.visual.json', 'page.fixtures.json', 'page.functions.ts'];
function gate() { let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; }); return { wait, release }; }
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'role-bundle-')); roots.push(root);
  const directory = path.join(root, 'page'); await mkdir(directory);
  const original = Object.fromEntries(roles.map(name => [name, `old:${name}`]));
  const candidate = Object.fromEntries(roles.map(name => [name, `new:${name}`]));
  for (const [name, value] of Object.entries(original)) await writeFile(path.join(directory, name), value);
  await writeFile(path.join(directory, 'index.ts'), 'unrelated entry');
  const location: RoleBundleLocation = { root, directory, anchor: 'page.visual.json', paths: roles };
  const snapshot = await readRoleBundle(location);
  const input = { files: candidate, expectedChecksum: snapshot.checksum, validate: vi.fn(), admit: vi.fn() };
  const journal = path.join(root, '.uib/transactions', storageKey(path.join(directory, location.anchor)), 'pending.json');
  return { location, original, candidate, snapshot, input, journal };
}
function child(code: string, location: RoleBundleLocation) {
  const entry = pathToFileURL(path.resolve('packages/artifacts/dist/storage-api.js')).href;
  return new Promise<{ code: number | null; output: string; error: string }>((resolve, reject) => {
    const processChild = spawn(process.execPath, ['--input-type=module', '-e', `import { readRoleBundle, saveRoleBundle } from ${JSON.stringify(entry)}; const location=JSON.parse(process.env.ROLE_LOCATION); ${code}`], {
      windowsHide: true, env: { ...process.env, ROLE_LOCATION: JSON.stringify(location) }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '', error = ''; processChild.stdout.on('data', value => { output += value; }); processChild.stderr.on('data', value => { error += value; });
    processChild.on('error', reject); processChild.on('exit', code => resolve({ code, output, error }));
  });
}
it.each(roles)('rolls back real partial source writes when role %s fails', async failingRole => {
  const f = await fixture();
  await expect(saveRoleBundle(f.location, { ...f.input, beforeWrite(name) { if (name === failingRole) throw new Error('Injected role failure'); } })).rejects.toThrow('Injected role failure');
  expect((await readRoleBundle(f.location)).files).toEqual(f.original);
  await expect(access(f.journal)).rejects.toThrow();
  await expect(access(path.join(f.location.directory, 'artifact.json'))).rejects.toThrow();
  expect(await readFile(path.join(f.location.directory, 'index.ts'), 'utf8')).toBe('unrelated entry');
});
it('validates the complete candidate before admission or persistence and confirms no-ops without writes', async () => {
  const f = await fixture();
  await expect(saveRoleBundle(f.location, { ...f.input, validate(candidate, previous) { expect(candidate.files).toEqual(f.candidate); expect(previous.files).toEqual(f.original); throw new Error('Invalid complete candidate'); } })).rejects.toThrow('Invalid complete candidate');
  expect(f.input.admit).not.toHaveBeenCalled(); expect((await readRoleBundle(f.location)).files).toEqual(f.original);
  const beforeWrite = vi.fn(); await saveRoleBundle(f.location, { ...f.input, files: f.original, beforeWrite }); expect(beforeWrite).not.toHaveBeenCalled();
});
it('holds cooperating readers until commit while proving raw filesystem readers can observe mixed roles', async () => {
  const f = await fixture(), entered = gate(), release = gate();
  const saving = saveRoleBundle(f.location, { ...f.input, async beforeWrite(_, index) { if (index === 1) { entered.release(); await release.wait; } } });
  await entered.wait;
  expect(await readFile(path.join(f.location.directory, 'page.css'), 'utf8')).toBe(f.candidate['page.css']);
  expect(await readFile(path.join(f.location.directory, 'page.visual.json'), 'utf8')).toBe(f.original['page.visual.json']);
  let observed = false; const reading = readRoleBundle(f.location).then(result => { observed = true; return result; });
  await new Promise(resolve => setTimeout(resolve, 50)); expect(observed).toBe(false);
  release.release(); await saving; expect((await reading).files).toEqual(f.candidate);
});
it('retains the journal after rollback failure and recovers through a fresh process before reading', async () => {
  const f = await fixture();
  await expect(saveRoleBundle(f.location, { ...f.input, beforeWrite(_, index) { if (index === 2) throw new Error('Write failed'); }, beforeRollbackWrite() { throw new Error('Rollback failed'); } })).rejects.toBeInstanceOf(RoleBundleRecoveryRequiredError);
  await access(f.journal);
  const recovered = await child('console.log(JSON.stringify(await readRoleBundle(location)))', f.location);
  expect(recovered.code, recovered.error).toBe(0); expect(JSON.parse(recovered.output).files).toEqual(f.original); await expect(access(f.journal)).rejects.toThrow();
});
it('fails closed for an unrecoverable journal on both reads and later writes', async () => {
  const f = await fixture();
  await expect(saveRoleBundle(f.location, { ...f.input, beforeWrite(_, index) { if (index === 2) throw new Error('Write failed'); }, beforeRollbackWrite() { throw new Error('Rollback failed'); } })).rejects.toBeInstanceOf(RoleBundleRecoveryRequiredError);
  await writeFile(f.journal, '{corrupt'); const before = await readFile(path.join(f.location.directory, 'page.css'), 'utf8');
  await expect(readRoleBundle(f.location)).rejects.toMatchObject({ code: 'source.recovery-required' });
  await expect(saveRoleBundle(f.location, f.input)).rejects.toMatchObject({ code: 'source.recovery-required' });
  expect(await readFile(path.join(f.location.directory, 'page.css'), 'utf8')).toBe(before); await access(f.journal);
});
it('recovers a process crash and stale PID lock before returning any source', async () => {
  const f = await fixture();
  const crashed = await child(`const before=await readRoleBundle(location); await saveRoleBundle(location,{expectedChecksum:before.checksum,files:Object.fromEntries(Object.keys(before.files).map(name=>[name,'crashed:'+name])),validate(){},admit(){},beforeWrite(_,index){if(index===1) process.exit(93)}});`, f.location);
  expect(crashed.code, crashed.error).toBe(93); await access(f.journal);
  expect((await readRoleBundle(f.location)).files).toEqual(f.original); await expect(access(f.journal)).rejects.toThrow();
});
it('rejects stale checksums and external modifications during validation without overwriting them', async () => {
  const f = await fixture();
  await expect(saveRoleBundle(f.location, { ...f.input, expectedChecksum: 'stale' })).rejects.toBeInstanceOf(ArtifactConflictError);
  await expect(saveRoleBundle(f.location, { ...f.input, async validate() { await writeFile(path.join(f.location.directory, 'page.html'), 'external source'); } })).rejects.toBeInstanceOf(ArtifactConflictError);
  expect(await readFile(path.join(f.location.directory, 'page.html'), 'utf8')).toBe('external source'); expect(f.input.admit).not.toHaveBeenCalled();
});
it('blocks authority revoked during candidate validation before admission', async () => {
  const f = await fixture(), entered = gate(), release = gate(); let authorized = true;
  const saving = saveRoleBundle(f.location, { ...f.input, async validate() { entered.release(); await release.wait; }, admit() { if (!authorized) throw new Error('Original authority revoked'); } });
  const rejection = expect(saving).rejects.toThrow('Original authority revoked');
  await entered.wait; authorized = false; release.release(); await rejection;
  expect((await readRoleBundle(f.location)).files).toEqual(f.original); await expect(access(f.journal)).rejects.toThrow();
});
it('rejects a journal that targets files outside the declared role set', async () => {
  const f = await fixture(); await mkdir(path.dirname(f.journal), { recursive: true });
  await writeFile(f.journal, JSON.stringify({ original: { ...f.original, 'index.ts': 'overwrite unrelated source' } }));
  await expect(readRoleBundle(f.location)).rejects.toBeInstanceOf(RoleBundleRecoveryRequiredError);
  expect(await readFile(path.join(f.location.directory, 'index.ts'), 'utf8')).toBe('unrelated entry');
});
it('rejects another owner root and unsafe role paths before touching source', async () => {
  const f = await fixture(), other = await fixture();
  await expect(readRoleBundle({ ...other.location, root: f.location.root })).rejects.toThrow('outside its owner root');
  await expect(saveRoleBundle({ ...f.location, paths: [...roles, '../outside.txt'] }, f.input)).rejects.toThrow('safe role paths');
  expect((await readRoleBundle(f.location)).files).toEqual(f.original); expect((await readRoleBundle(other.location)).files).toEqual(other.original);
});

it.runIf(process.platform === 'win32')('rejects case aliases and case-duplicate role declarations on Windows', async () => {
  const f = await fixture();
  await expect(readRoleBundle({ ...f.location, anchor: 'PAGE.visual.json', paths: roles.map(name => name === 'page.visual.json' ? 'PAGE.visual.json' : name) })).rejects.toThrow('casing');
  await expect(readRoleBundle({ ...f.location, paths: [...roles, 'PAGE.html'] })).rejects.toThrow('Unique safe role paths');
  expect((await readRoleBundle(f.location)).files).toEqual(f.original);
});

it('waits for PID publication without stealing live or permanently incomplete filesystem locks', async () => {
  const f = await fixture();
  const lock = path.join(f.location.root, '.uib/locks', storageKey(path.join(f.location.directory, f.location.anchor)) + '.lock');
  await writeFile(lock, '');
  const publish = new Promise<void>(resolve => setTimeout(resolve, 10)).then(() => writeFile(lock, String(process.pid)));
  const started = performance.now();
  await expect(readRoleBundle(f.location)).rejects.toThrow('locked by another writer'); await publish;
  expect(performance.now() - started).toBeGreaterThanOrEqual(4900);
  expect(performance.now() - started).toBeLessThan(10_000);
  expect(await readFile(lock, 'utf8')).toBe(String(process.pid));
  await writeFile(lock, '');
  await expect(readRoleBundle(f.location)).rejects.toBeInstanceOf(ArtifactOwnerUnresolvedError);
  expect(await readFile(lock, 'utf8')).toBe('');
  await rm(lock); expect((await readRoleBundle(f.location)).files).toEqual(f.original);
// The operation intentionally exhausts a 5s admission budget before checking
// the incomplete-lock and recovery assertions. Keep the harness outside it.
}, 15_000);
