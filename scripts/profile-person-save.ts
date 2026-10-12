import { performance } from 'node:perf_hooks';
import { startAutomationReference } from './trigger-workflow-reference-host.js';
import { closeFormReference } from './form-reference-host.js';
import { AutomationRuntime } from '../src/server/automation-runtime.js';
import { SecuredDatasetOperationEngine } from '@ui-platform/dataset-operations';
const stats = new Map<string, { calls: number; ms: number; max: number }>();
const seen = new WeakSet<object>();
function instrument(object: any, label: string, depth = 0) {
  if (!object || typeof object !== 'object' || seen.has(object) || depth > 5 || Array.isArray(object) || object instanceof Map) return;
  seen.add(object);
  for (const key of Object.keys(object)) if (object[key] && typeof object[key] === 'object') instrument(object[key], `${label}.${key}`, depth + 1);
  const proto = Object.getPrototypeOf(object);
  const keys = new Set([...Object.keys(object), ...(proto && proto !== Object.prototype ? Object.getOwnPropertyNames(proto) : [])]);
  for (const key of keys) {
    if (key === 'constructor' || typeof object[key] !== 'function') continue;
    const original = object[key], name = `${label}.${key}`;
    object[key] = function (...args: any[]) {
      const start = performance.now();
      const finish = () => { const ms = performance.now() - start; const row = stats.get(name) ?? { calls: 0, ms: 0, max: 0 }; row.calls++; row.ms += ms; row.max = Math.max(row.max, ms); stats.set(name, row); };
      try { const value = original.apply(this, args); if (value?.then) return value.then((v: any) => { finish(); return v; }, (e: any) => { finish(); throw e; }); finish(); return value; }
      catch (e) { finish(); throw e; }
    };
  }
}
const connect = AutomationRuntime.prototype.connect;
const write = SecuredDatasetOperationEngine.prototype.write;
SecuredDatasetOperationEngine.prototype.write = function (...args: any[]) { instrument(this, 'engine'); return write.apply(this, args as any); };
AutomationRuntime.prototype.connect = function (triggers: any, resolve: any) { instrument(triggers, 'triggers'); return connect.call(this, triggers, resolve); };
const host = await startAutomationReference();
try {
  const origin = host.origin;
  const session = await fetch(origin + '/api/development-identity/session');
  const cookie = session.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
  const { csrfToken } = await session.json();
  const login = await fetch(origin + '/api/development-identity/session', { method: 'POST', headers: { cookie, origin, 'content-type': 'application/json', 'x-v1-csrf': csrfToken }, body: JSON.stringify({ email: 'admin@example.local' }) });
  const activeCookie = login.headers.getSetCookie().map(v => v.split(';')[0]).join('; ') || cookie;
  stats.clear(); const start = performance.now();
  const response = await fetch(origin + '/api/application-data/operations', { method: 'POST', headers: { cookie: activeCookie, origin, 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'dataset-person-form-reference', operation: 'insert', records: [{ id: crypto.randomUUID(), firstName: 'Timing', lastName: 'Probe', email: 'timing@example.test' }] }) });
  console.log('SAVE', response.status, await response.text(), 'elapsedMs', Math.round(performance.now() - start));
  console.log(JSON.stringify([...stats].sort((a, b) => b[1].ms - a[1].ms).slice(0, 35), null, 2));
} finally { await closeFormReference(); }
