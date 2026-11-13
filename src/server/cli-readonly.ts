import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { V1DevelopmentIdentity } from './v1-development-identity.js';
import type { DevelopmentApplicationRuntime } from './development-application-runtime.js';
import type { DevelopmentApplicationRegistry } from './development-application-registry.js';
import { V1_AUTHORITY_ID } from './v1-development-policy.js';
type App = { appId: string; key: string; name?: string };
/** Read-only adapter. Every record query traverses the existing Platform proxy. */
export function createCliReadonly(identity: V1DevelopmentIdentity, runtime: DevelopmentApplicationRuntime, registry: DevelopmentApplicationRegistry, apps: () => Promise<App[]>) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = new URL(req.url ?? '/', 'http://localhost'); if (!url.pathname.startsWith('/api/cli/')) return false;
    const send = (status: number, data: unknown) => res.writeHead(status, {'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify(data));
    try {
      // Branded server request retains the access credential's parent-session checks.
      const actorRequest = Readable.from([]) as unknown as IncomingMessage;
      actorRequest.headers = {}; Object.defineProperty(actorRequest,'socket',{value:req.socket});
      identity.bindCliRequest(req, actorRequest);
      const policy = identity.policyDigest();
      const actor = identity.currentUser(actorRequest); if (!actor) throw Error('CLI_UNAUTHENTICATED');
      const assert = () => { if (identity.currentUser(actorRequest) !== actor || identity.policyDigest() !== policy) throw Error('CLI_UNAUTHENTICATED'); };
      const allowed = async (app: App) => registry.byApplicationId(app.appId)?.key === app.key && await identity.authorize(actorRequest,'ui.application.view',{authorityId:V1_AUTHORITY_ID,applicationId:app.appId,kind:'application',id:app.appId});
      if (req.method !== 'GET') { send(405,{code:'CLI_READ_ONLY'}); return true; }
      if (url.pathname === '/api/cli/apps' && !url.search) {
        const visible = []; for (const app of await apps()) if (await allowed(app)) visible.push({id:app.appId,key:app.key,name:app.name ?? app.key});
        assert(); send(200,visible); return true;
      }
      if (!['/api/cli/datasets','/api/cli/export'].includes(url.pathname) || [...url.searchParams.keys()].some(k=>!['app','dataset'].includes(k)) || url.searchParams.getAll('app').length!==1 || url.searchParams.getAll('dataset').length>1) throw Error('CLI_REQUEST_INVALID');
      const id = url.searchParams.get('app')!, app = registry.byApplicationId(id);
      if (!app || !await allowed({appId:id,key:app.key})) throw Error('CLI_SCOPE_DENIED');
      const query = async (datasetId: string, probe: boolean) => {
        const forwarded = Readable.from([JSON.stringify({datasetId, ...(probe?{select:['id'],limit:1}:{limit:10001})})]) as unknown as IncomingMessage;
        forwarded.method='POST';forwarded.url=`/api/apps/${encodeURIComponent(app.key)}/application-data/queries`;
        forwarded.headers={'content-type':'application/json',origin:identity.cliOrigin()};Object.defineProperty(forwarded,'socket',{value:req.socket});identity.bindCliRequest(req,forwarded);
        let status=0,body='';const response={writeHead(code:number){status=code;return this;},end(bytes: unknown){body=String(bytes??'');}} as unknown as ServerResponse;
        await runtime.handle(forwarded,response);assert();
        if (!await allowed({appId:id,key:app.key})) throw Error('CLI_SCOPE_DENIED');
        if(status!==200)throw Error('CLI_READ_DENIED');const rows=JSON.parse(body);if(!Array.isArray(rows))throw Error('CLI_READ_DENIED');return rows;
      };
      const connected=runtime.connectedDatasets(id);
      if(url.pathname==='/api/cli/datasets') {
        if(url.searchParams.has('dataset'))throw Error('CLI_REQUEST_INVALID');
        const visible=[];for(const dataset of connected){try{await query(dataset,true);visible.push({id:dataset});}catch{assert();}}
        assert();send(200,visible);return true;
      }
      const dataset=url.searchParams.get('dataset');if(!dataset||!connected.includes(dataset))throw Error('CLI_SCOPE_DENIED');
      const rows=await query(dataset,false);if(rows.length>10000)throw Error('CLI_EXPORT_LIMIT');assert();send(200,rows);
    } catch(error) { send(403,{code:error instanceof Error && /^CLI_[A-Z_]+$/.test(error.message)?error.message:'CLI_READ_DENIED'}); }
    return true;
  };
}
