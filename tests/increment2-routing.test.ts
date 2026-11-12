import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { DevelopmentApplicationRuntime } from '../src/server/development-application-runtime.js';
import { createApplicationDataProxy } from '../src/server/application-data-proxy.js';
import { connectionDatasetIds } from '../src/server/dataset-development.js';

const temp = mkdtempSync(path.join(tmpdir(), 'patrol-inc2-routing-'));
const policy = path.join(temp, 'policy'); writeFileSync(policy, 'fixture');
const origin = 'http://127.0.0.1:5474';
const registry: any = { byKey: (key: string) => key === 'app' ? { applicationId: 'app-id' } : undefined, provisioning: { resolve: () => true } };
let user: string | null = 'editor';
const identity: any = { currentUser: () => user, policyDigest: () => 'policy', authorize: async () => true };
const connection = (id: string, port: number, workflowIds: string[] = []) => ({ applicationId: 'app-id', key: 'app', hostUrl: `http://127.0.0.1:${port}`, trustedUiServerKey: id.padEnd(40, '-'), policyStore: policy, datasetId: id, workflowIds });
const configFile = path.join(temp, 'connections.json');
const fresh = (file?: string) => new DevelopmentApplicationRuntime(file, policy, registry, identity, [origin]);
const calls: Array<{ url: string; body: any; token: string }> = [];
const originalFetch = globalThis.fetch;
let failScout = false;
globalThis.fetch = (async (url: any, init: any) => {
  const target = String(url); const scout = target.includes(':8002');
  if (scout && failScout) throw Error('host unavailable');
  const token = init.headers.authorization;
  const [, payload, signature] = token.split('.');
  assert.equal(signature, createHmac('sha256', (scout ? 'scout' : 'patrol').padEnd(40, '-')).update(payload).digest('base64url'));
  assert.equal(JSON.parse(Buffer.from(payload, 'base64url').toString()).userId, user);
  if (target.endsWith('/onboarding')) return Response.json({ applicationId: 'app-id', authorityId: 'ui-platform-development', datasetId: scout ? 'scout' : 'patrol', publication: { checksum: 'checksum' }, serving: { generation: 'generation', fingerprint: 'fingerprint' }, workflowIds: [], catalog: { appId: 'app-id', datasets: [{ id: scout ? 'scout' : 'patrol' }], services: [], workflows: [] } });
  calls.push({ url: target, body: JSON.parse(init.body.toString()), token });
  return Response.json({ success: true });
}) as typeof fetch;
after(() => { globalThis.fetch = originalFetch; rmSync(temp, { recursive: true, force: true }); });
test('durable connection metadata accepts legacy without mutating it and rejects ambiguous shapes', () => {
  const legacy = { datasetId: 'patrol' }; assert.deepEqual(connectionDatasetIds(legacy), ['patrol']); assert.deepEqual(legacy, {datasetId:'patrol'});
  assert.deepEqual(connectionDatasetIds({version:1,datasetIds:['patrol','scout']}),['patrol','scout']);
  for(const input of [null,{},[],{datasetId:'patrol',datasetIds:['scout']},{version:2,datasetIds:['patrol']},{version:1,datasetIds:['patrol','patrol']},{version:1,datasetIds:[123]},{version:1,datasetIds:['../foreign']}]) assert.throws(()=>connectionDatasetIds(input), {code:'DATASET_CONNECTION_METADATA_INVALID'});
});
async function post(runtime: DevelopmentApplicationRuntime, action: string, body: unknown, headers: Record<string,string> = {}) {
  const req: any = Readable.from([JSON.stringify(body)]); req.url = `/api/apps/app/application-data/${action}`; req.method = 'POST'; req.headers = { origin, ...headers };
  let status = 0, text = ''; const res: any = { writeHead(code: number) { status = code; return this; }, end(value = '') { text = value; } };
  assert.equal(await runtime.handle(req, res), true); return { status, text };
}
test('queries, writes and record delete use exact Dataset and host assertion key', async () => {
  const r = fresh(); r.connectManaged(connection('patrol',8001)); r.connectManaged(connection('scout',8002));
  for (const id of ['patrol','scout']) for (const [action, extra] of [['queries',{}],['operations',{operation:'insert'}],['operations',{operation:'update'}],['operations',{operation:'delete'}],['operations',{kind:'record-delete',version:1,primaryFieldId:'id',recordId:'synthetic'}]] as const) {
    assert.equal((await post(r,action,{datasetId:id,...extra})).status,200);
    assert.ok(calls.at(-1)!.url.includes(id === 'patrol' ? ':8001/' : ':8002/')); assert.equal(calls.at(-1)!.body.datasetId,id);
  }
});
test('missing, unknown, foreign and disconnected IDs never fall back', async () => {
  const r=fresh(); r.connectManaged(connection('patrol',8001)); r.connectManaged(connection('scout',8002)); r.disconnectManaged('app-id','scout');
  const count=calls.length;
  for(const body of [{},{datasetId:''},{datasetId:'unknown'},{datasetId:'foreign'},{datasetId:'scout'},{datasetId:['patrol']}]) assert.equal((await post(r,'queries',body)).status,503);
  assert.equal(calls.length,count); assert.equal((await post(r,'queries',{datasetId:'patrol'})).status,200);
});
test('Workflow IDs must select exactly one configured host', async () => {
  const r=fresh();r.connectManaged(connection('patrol',8001,['patrol-workflow','shared']));r.connectManaged(connection('scout',8002,['shared']));
  assert.equal((await post(r,'workflows',{workflowId:'patrol-workflow',primaryRecordId:'x'})).status,200);
  const count=calls.length;
  for(const workflowId of ['shared','missing']) assert.equal((await post(r,'workflows',{workflowId,primaryRecordId:'x'})).status,503);
  assert.equal((await post(r,'workflows',{workflowId:'patrol-workflow',datasetId:'scout'})).status,503);assert.equal(calls.length,count);
});
test('legacy configuration, duplicate rejection and independent failure/readiness', async () => {
  writeFileSync(configFile,JSON.stringify([connection('patrol',8001)])); const r=fresh(configFile);
  assert.deepEqual(r.connectedDatasets('app-id'),['patrol']);assert.equal((await post(r,'queries',{datasetId:'patrol'})).status,200);
  r.connectManaged(connection('scout',8002));assert.deepEqual(r.connectedDatasets('app-id'),['patrol','scout']);
  assert.equal((await r.authoringCatalog('app-id',{} as any)).datasets.length,2);
  failScout=true;
  try { assert.equal((await r.readiness('app-id',{} as any,'patrol')).ready,true);assert.equal((await r.readiness('app-id',{} as any,'scout')).ready,false);assert.equal((await r.readiness('app-id',{} as any)).ready,false);assert.equal((await post(r,'operations',{datasetId:'scout',operation:'insert'})).status,503);assert.equal((await post(r,'queries',{datasetId:'patrol'})).status,200); } finally {failScout=false;}
  writeFileSync(configFile,JSON.stringify([connection('patrol',8001),connection('patrol',8001)]));assert.throws(()=>r.connectedDatasets('app-id'),/DUPLICATE/);
});
test('signed-out, forged bearer and foreign Origin are rejected before forwarding', async () => {
  const r=fresh();r.connectManaged(connection('patrol',8001));const count=calls.length;
  user=null;try {assert.equal((await post(r,'queries',{datasetId:'patrol'})).status,401);}finally {user='editor';}
  assert.equal((await post(r,'queries',{datasetId:'patrol'},{authorization:'Bearer forged'})).status,403);
  assert.equal((await post(r,'queries',{datasetId:'patrol'},{origin:'http://foreign.invalid'})).status,403);assert.equal(calls.length,count);
});
test('legacy static proxy still forwards to its configured target', async () => {
  const proxy=createApplicationDataProxy({enabled:true,environment:'development',protectedHostUrl:'http://127.0.0.1:8001',v1Identity:{resolveUser:()=>user,trustedUiServerKey:'patrol'.padEnd(40,'-'),applicationId:'app-id',authorityId:'ui-platform-development',policyDigest:()=> 'policy',origins:[origin]}});
  const req:any=Readable.from([JSON.stringify({datasetId:'patrol'})]);req.url='/api/application-data/queries';req.method='POST';req.headers={origin};let status=0;const res:any={writeHead(s:number){status=s;return this;},end(){}};
  await proxy(req,res);assert.equal(status,200);
});
