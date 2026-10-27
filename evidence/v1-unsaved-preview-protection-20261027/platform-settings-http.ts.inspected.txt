import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PlatformSettingsAuthority } from './platform-settings.js';

export interface SettingsAccess {
  /** Capture original session; recheck it and current permissions on every admission. */
  capture(req: IncomingMessage, mutation: boolean): Promise<{ assert(): Promise<void>; canModify(): Promise<boolean> }>;
}
export function platformSettingsHandler(authority: PlatformSettingsAuthority, access: SettingsAccess) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (!['/api/platform/settings', '/api/platform/settings/events'].includes(pathname)) return false;
    try {
      const mutation = req.method === 'PUT';
      if (req.method !== 'GET' && !mutation || mutation && pathname.endsWith('/events')) throw Object.assign(new Error('Unsupported settings request.'), { status: 405 });
      const session = await access.capture(req, mutation);
      const snapshot = async () => { await session.assert(); const value = await authority.read(); const canModify = await session.canModify(); await session.assert(); return { ...value, canModify }; };
      if (pathname.endsWith('/events')) {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
        let closed = false, busy = false, previous = '';
        const stop = () => { closed = true; clearInterval(timer); res.end(); };
        const tick = async () => {
          if (busy || closed) return; busy = true;
          try { const value = await snapshot(), text = JSON.stringify(value); if (!closed && text !== previous) { previous = text; res.write(`data: ${text}\n\n`); } }
          catch { if (!closed) res.write('event: revoked\ndata: {}\n\n'); stop(); }
          finally { busy = false; }
        };
        const timer = setInterval(() => { void tick(); }, 250); timer.unref();
        res.on('close', stop); await tick(); return true;
      }
      if (mutation) {
        if (!await session.canModify()) throw Object.assign(new Error('Platform administrator permission is required.'), { status: 403 });
        let text = ''; for await (const chunk of req) { text += chunk; if (text.length > 16000) throw Object.assign(new Error('Settings request is too large.'), { status: 413 }); }
        const input = JSON.parse(text);
        await authority.update(input.settings, input.expectedRevision, session.assert);
      }
      const result = await snapshot();
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(result));
    } catch (error) {
      const failure = error as { status?: number; code?: string };
      // Never send storage paths, raw configuration or underlying read errors.
      res.writeHead(failure.status ?? 400, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({ code: failure.code ?? 'settings.unavailable', error: failure.status === 409 ? (error as Error).message : 'Platform settings request was rejected.' }));
    }
    return true;
  };
}
