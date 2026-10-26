import type { FixtureSample } from './samples.js';
export interface FixtureChannel { nonce: string; session: string; identity: string; sequence: number }
export type FixtureMessage = FixtureChannel & ({ type: 'render'; sample: FixtureSample; reason?: never } | { type: 'ready' | 'unavailable'; reason?: string; sample?: never });
export function validChannel(value: unknown, expected: FixtureChannel): value is FixtureMessage {
  if (!value || typeof value !== 'object') return false;
  const v = value as FixtureMessage;
  const fields = v.type === 'render' ? ['nonce', 'session', 'identity', 'sequence', 'type', 'sample'] : ['nonce', 'session', 'identity', 'sequence', 'type', ...(v.reason === undefined ? [] : ['reason'])];
  return Object.keys(v).length === fields.length && Object.keys(v).every(key => fields.includes(key)) &&
    ['render', 'ready', 'unavailable'].includes(v.type) && v.nonce === expected.nonce && v.session === expected.session &&
    v.identity === expected.identity && v.sequence === expected.sequence && Number.isSafeInteger(v.sequence) && v.sequence > 0 &&
    (v.reason === undefined || typeof v.reason === 'string' && v.reason.length <= 256);
}
