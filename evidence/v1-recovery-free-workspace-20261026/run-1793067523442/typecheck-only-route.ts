import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { VisualArtifactService, visualWorkspace, platformComponentsRoot } from '../../../src/server/visual-artifacts.js';
import { withApplicationMutation } from '../../../src/server/composition-lock.js';
import { visualPreviewRevision, isolatedPreviewCode } from '../../../src/server/visual-preview.js';
import { appPath } from '../../../tests/workspace-reads/boundaries.js';
import { discoverComponents } from '../../../tests/workspace-reads/boundaries.js';
declare function getApp(key: string): Promise<{ appId: string }>;
declare function json(res: ServerResponse, status: number, body: unknown): void;
declare const v1Identity: null | { authorize(req: IncomingMessage, permission: string, resource: { authorityId: string; applicationId: string; kind: string; id: string; parentId?: string }): Promise<boolean> };
export async function check(req: IncomingMessage, res: ServerResponse, key: string, parts: string[], method: string, url: URL, acquisition: AbortController) {
      if (parts.length === 4 && ['visual-artifacts', 'visual-pages', 'visual-components', 'visual-shells'].includes(parts[3])) {
        await getApp(key);
        if (parts[3] === 'visual-artifacts' && method === 'GET') {
          const readOptions = { recovery: 'refuse' as const, signal: acquisition.signal };
          return json(res, 200, await withApplicationMutation(appPath(key), async () => visualWorkspace(key, await discoverComponents(key), readOptions), readOptions));
        }
        const kind = parts[3] === 'visual-components' ? 'component' : parts[3] === 'visual-shells' ? 'shell' : 'page';
        const service = new VisualArtifactService(kind === 'component' ? platformComponentsRoot : path.join(appPath(key), kind === 'shell' ? 'shells' : 'src/pages'), kind);
        const locator = url.searchParams.get('locator');
        if (parts[3] === 'visual-artifacts') throw new Error('The workspace endpoint supports GET only.');
        if (method === 'GET') {
          if (locator && url.searchParams.get('preview') === '1') {
            const owner = (await getApp(key)).appId;
            return json(res, 200, await visualPreviewRevision(key, kind, locator, url.searchParams.get('hash') ?? '', async related => {
              if (v1Identity && !await v1Identity.authorize(req, related === 'shell' ? 'ui.presentation.view' : 'ui.application.view', { authorityId: 'ui-platform-development', applicationId: owner, kind: related === 'shell' ? 'artifact' : 'application', id: related === 'shell' ? 'presentation' : owner, ...(related === 'shell' ? { parentId: owner } : {}) })) throw Object.assign(new Error('Preview dependencies require current source read authority.'), { status: 403 });
            }, { recovery: 'refuse', signal: acquisition.signal }));
          }
          const readOptions = { recovery: 'refuse' as const, signal: acquisition.signal };
          const bundle = locator ? await service.read(locator, readOptions) : null;
          if (bundle && url.searchParams.get('code') === '1') {
            if (url.searchParams.get('hash') !== bundle.hash) throw Object.assign(new Error('Preview code revision changed. Reload the complete preview.'), { status: 409 });
            const code = isolatedPreviewCode(bundle);
            res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }); return res.end(code);
          }
          return json(res, 200, bundle ?? await service.list(readOptions));
        }

  }
}
