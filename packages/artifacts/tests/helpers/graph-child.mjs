import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = await fs.realpath(process.argv[2]), run = process.argv[3];
const key = createHash('sha256').update('visual-runtime-graph-v1').digest('hex');
const file = path.join(root, '.uib', 'locks', key + '.lock');
if (!path.basename(root).startsWith('d6-')) throw new Error('Unexpected disposable graph root');
const events = [], native = { open: fs.open, rm: fs.rm, readFile: fs.readFile };
const emit = (phase, data = {}) => { const e = { pid: process.pid, seq: events.length + 1, op: 'child', phase, utc: new Date().toISOString(), mono: performance.now(), ...data }; events.push(e); return e; };
fs.open = async (...args) => {
  if (String(args[0]) !== file) return native.open(...args);
  if (args[1] !== 'wx') throw new Error('Unexpected graph open');
  emit('open.attempt');
  try {
    const handle = await native.open(...args); emit('open.complete', { fd: handle.fd });
    return new Proxy(handle, { get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof value !== 'function') return value;
      return async (...input) => {
        emit(String(property) + '.attempt', { input: property === 'writeFile' ? input : undefined });
        try { const result = await value.apply(target, input); emit(String(property) + '.complete', { fd: target.fd }); return result; }
        catch (e) { emit(String(property) + '.error', { code: e.code, message: String(e) }); throw e; }
      };
    } });
  } catch (e) {
    const event = emit('open.error', { code: e.code, message: String(e) });
    if (e.code === 'EEXIST') process.send({ kind: 'contended', run, file, code: e.code, seq: event.seq });
    throw e;
  }
};
fs.rm = async (...args) => { if (String(args[0]) !== file) return native.rm(...args); emit('unlink.attempt'); await native.rm(...args); emit('unlink.complete'); };
fs.readFile = async (...args) => { const text = await native.readFile(...args); if (String(args[0]) === file) emit('owner.read', { actualText: String(text) }); return text; };
syncBuiltinESMExports();
const { withRoleBundleGraph } = await import('@ui-platform/artifacts/storage');
const module = new URL('../../dist/storage.js', import.meta.url);
process.send({ kind: 'ready', root, key, run, pid: process.pid, ppid: process.ppid, timeOrigin: performance.timeOrigin, executable: process.execPath,
  compiledStorageSha256: createHash('sha256').update(await fs.readFile(module)).digest('hex') });
await new Promise(resolve => process.once('message', m => { if (m.kind !== 'begin') throw new Error('Unexpected gate'); resolve(); }));
let failure;
try {
  await withRoleBundleGraph(root, async () => {
    emit('callback.enter'); const witness = path.join(root, 'exclusion.witness');
    const handle = await native.open(witness, 'wx');
    try { emit('witness.owned'); await fs.appendFile(path.join(root, 'order.txt'), 'child\n'); }
    finally { await handle.close(); await native.rm(witness); emit('witness.released'); }
    emit('callback.exit');
  }, { timeoutMs: 3000 });
} catch (e) { failure = e; }
finally {
  await new Promise((resolve, reject) => process.send({ kind: 'result', run, events, failure: failure && { message: String(failure), stack: failure.stack } }, e => e ? reject(e) : resolve()));
  fs.open = native.open; fs.rm = native.rm; fs.readFile = native.readFile; syncBuiltinESMExports(); process.disconnect();
}
if (failure) throw failure;
