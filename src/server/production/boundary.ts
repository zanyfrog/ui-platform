import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const digest = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export const random = () => randomBytes(32).toString('base64url');
export function deny(): never { throw new Error('PROTECTED_REQUEST_DENIED'); }
export const identifier = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
export function equal(a: unknown, b: unknown): boolean {
  return typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export function exact(value: unknown, keys: string[], optional: string[] = []): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => ![...keys, ...optional].includes(k)) || keys.some(k => !Object.hasOwn(value, k))) deny();
}
export function origin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== value || url.username || url.password) deny();
  return value;
}
export function cookie(request: IncomingMessage, name: string): string | undefined {
  const matches = (request.headers.cookie ?? '').split(';').map(s => s.trim()).filter(s => s.startsWith(name + '='));
  if (matches.length > 1) deny();
  const value = matches[0]?.slice(name.length + 1);
  if (value !== undefined && !/^[A-Za-z0-9_-]{43}$/.test(value)) deny();
  return value;
}
export function noActor(request: IncomingMessage) {
  if (request.headers.authorization || Object.keys(request.headers).some(k => /^(x-(actor|user|role|admin|v1-actor)|x-uib-(?!csrf$))/.test(k))) deny();
}
export async function body(request: IncomingMessage, limit = 65536): Promise<Buffer> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) { const bytes = Buffer.from(chunk); if ((size += bytes.length) > limit) deny(); chunks.push(bytes); }
  return Buffer.concat(chunks);
}
export function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', 'vary': 'Cookie', 'x-content-type-options': 'nosniff' }).end(JSON.stringify(value));
}
