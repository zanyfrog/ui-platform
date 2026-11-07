import type { RequestListener } from 'node:http';
import type { SecureSessions } from './sessions.js';
import type { RuntimeTransport, PublicRelease } from './runtime.js';
import { runtimeHandler } from './runtime.js';
import type { OidcLogin } from './oidc.js';
import { body, cookie, deny, digest, json, noActor } from './boundary.js';

/** Separately authenticated frontend; target app keys are resolved by the owning registry, never trusted as authority. */
export function managementFrontendHandler(options: { sessions: SecureSessions; login: OidcLogin; transport: RuntimeTransport; publicRelease: PublicRelease;
  applicationId(key: string): string | undefined }) : RequestListener {
  const auth = runtimeHandler({ sessions: options.sessions, login: options.login, selected: async()=>options.publicRelease, transport:options.transport });
  return async (request,response)=>{
    if (!request.url?.startsWith('/api/')) { if (request.url?.startsWith('/runtime/')) { json(response,404,{code:'NOT_FOUND'});return; } return auth(request,response); }
    try {
      noActor(request);
      const match=/^\/api\/apps\/([a-zA-Z0-9-]+)\/security\/(roles|assign|revoke|activate|stage|revoke-sessions|template-register|template-revoke)$/.exec(request.url); if(!match)deny();
      const mutation=match[2]!=='roles';if(request.method!==(mutation?'POST':'GET'))deny();
      const session=await options.sessions.read(request,mutation),applicationId=options.applicationId(match[1]!);if(!applicationId)deny();
      let bytes=await body(request,100_000); if(mutation){const input=JSON.parse(bytes.toString('utf8'));if(input.expectedApplicationId!==undefined&&input.expectedApplicationId!==applicationId)deny();delete input.expectedApplicationId;bytes=Buffer.from(JSON.stringify(input));}
      const current=await options.sessions.read(request,mutation);if(JSON.stringify(current.enrollment)!==JSON.stringify(session.enrollment)||current.epoch!==session.epoch||current.csrf!==session.csrf)deny();
      const actor={enrollment:session.enrollment,sessionId:digest(cookie(request,options.sessions.cookieName)!),sessionEpoch:session.epoch,releaseId:'management'};
      const result=await options.transport.send(actor,`/management/${applicationId}/security/${match[2]}`,bytes,request);
      if(result.status!==200)deny();json(response,200,JSON.parse(result.bytes.toString('utf8')));
    }catch{json(response,403,{code:'PROTECTED_REQUEST_DENIED'});}
  };
}

