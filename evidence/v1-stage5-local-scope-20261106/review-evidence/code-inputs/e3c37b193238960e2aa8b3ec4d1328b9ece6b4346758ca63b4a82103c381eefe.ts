// Local qualification process composition only. No provider substitute or production launcher.
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import {createServer,decorate} from '../../src/server/production/private-access-trace.js';
import { X509Certificate } from 'node:crypto';
import { importPKCS8, importSPKI } from '../../src/server/production/node_modules/jose/dist/webapi/index.js';
import { SecurityDefinitionStore, SecurityDefinitionService } from '@ui-platform/i-am/definitions';
import { DatasetSecurityPlanService } from '@ui-platform/i-am/dataset-security';
import { SecurityAdministrationService } from '@ui-platform/i-am/administration';
import { developmentSecurityConfiguration, developmentSecurityScopes } from '../../src/server/v1-security-administration.js';
import { ServiceRpcClient, ServiceRpcVerifier, serviceRpcHandler } from '../../src/server/production/service-rpc.js';
import { iamIdentityDirectory, RemoteIdentityDirectory, identityOperations, sessionOperations, remoteSessionStatus } from '../../src/server/production/identity-integration.js';
import { InternalSigner, InternalVerifier } from '../../src/server/production/internal-trust.js';
import { SecureSessions } from '../../src/server/production/sessions.js';
import { runtimeHandler } from '../../src/server/production/runtime.js';
import { managementFrontendHandler } from '../../src/server/production/management-frontend.js';
import { MtlsRuntimeTransport } from '../../src/server/production/mtls-transport.js';
import { MtlsManagementTransport } from '../../src/server/production/mtls-management-transport.js';
import { openAppliedData } from '../../src/server/production/applied-integration.js';
import { ApplicationPublicationSelection } from '../../src/server/production/publication-integration.js';
import { ReleasedContracts } from '../../src/server/production/releases.js';
import { currentIam } from '../../src/server/production/current-iam.js';
import { PrivateAssetOwner } from '../../src/server/production/private-asset-owner.js';
import { PrivateAssets } from '../../src/server/production/private-assets.js';
import { protectedDataHandler } from '../../src/server/production/data-handler.js';
import { managementSecurityHandler } from '../../src/server/production/management.js';
import { digest } from '../../src/server/production/boundary.js';
import { InventoryPredicateTemplates,schemaWitness,applicationOwnershipWitness,holdResourceOwner } from '../../src/server/production/predicate-templates.js';
import { appliedIdentity } from '../../src/server/production/applied-integration.js';
import type { OidcLogin } from '../../src/server/production/oidc.js';

decorate(ServiceRpcVerifier,['authenticate']);decorate(InternalVerifier,['authenticate']);decorate(SecureSessions,['read','activeInternal']);decorate(RemoteIdentityDirectory,['current','resolve']);decorate(PrivateAssets,['reply']);decorate(PrivateAssetOwner,['lookup']);decorate(ReleasedContracts,['lease']);
const isolated=process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT,original=process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT;
if(!isolated||!original||isolated===original||!process.env.STAGE5_LOCAL_PROCESS_CONFIG)throw new Error('PHYSICAL_ISOLATION_REQUIRED');
// The parent has canonicalized/verified the original root. The confined child must
// not gain original-root read permission merely to repeat that comparison.
if(path.resolve(isolated).toLowerCase()===path.resolve(original).toLowerCase()||await realpath(process.cwd())!==await realpath(isolated))throw new Error('PHYSICAL_ISOLATION_REQUIRED');
const c=JSON.parse(await readFile(process.env.STAGE5_LOCAL_PROCESS_CONFIG,'utf8')),kind=c.kind;
if(!['runtime','management','data'].includes(kind))throw new Error('LOCAL_CONFIG_INVALID');
const key=await importPKCS8(await readFile(c.keyFile,'utf8'),'EdDSA'),tls={ca:await readFile(c.caFile,'utf8'),cert:await readFile(c.certFile,'utf8'),key:await readFile(c.tlsKeyFile,'utf8')};
const publicKeys:any={};for(const peer of c.peers)publicKeys[peer.id]=await importSPKI(await readFile(peer.publicKeyFile,'utf8'),'EdDSA');
const peer=(id:string,paths:string[])=>{const p=c.peers.find((p:any)=>p.id===id);return{id,keyId:id,key:publicKeys[id],fingerprint:p.fingerprint,paths};};
const client=(id:string,paths:string[])=>new ServiceRpcClient(c.endpoints[id].rpc,tls,kind,kind,key,c.endpoints[id].rpcAudience,paths);
const listen=async(server:any,port:number)=>new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
if(kind==='data'){
  const policy=new SecurityDefinitionStore(c.policyFile),directory=iamIdentityDirectory(c.enrollmentFile,policy,async()=>{throw new Error('OPERATOR_ONLY');});
  const owner=await PrivateAssetOwner.open(c.privateRoot,c.publicRoots),selection=new ApplicationPublicationSelection(c.applicationRoot,c.applicationId,c.schemaIdentity);
  const applied=await openAppliedData(c.applied,async ref=>{
    if(ref.kind==='artifact'&&ref.id===c.privateAssetId)return !!await owner.lookup(c.applicationId,c.privateAssetId,c.privateVersion);
    const release=await selection.read();
    for(const file of Object.keys(release.files).filter(f=>f.endsWith('.visual.json'))){const m=JSON.parse(await readFile(path.join(release.compositionRoot,file),'utf8'));if((m.componentId??m.artifactId)===ref.id)return true;}
    return false;
  });
  const sessionCheck=remoteSessionStatus(new Map([[c.applicationId,client('runtime',['/sessions/status'])],[c.managementApplicationId,client('management',['/sessions/status'])]]));
  const policyAuthority={async read(){const s=policy.snapshot();return{revision:String(s.revision),documents:s.documents};}},iam=currentIam(policyAuthority,applied.resources,directory,sessionCheck,{freshnessMs:15_000});
  const planner=new DatasetSecurityPlanService(applied.resources,iam.evaluator,policyAuthority,iam.identity,{operation:id=>c.applied.permissions.operation[id],field:usage=>c.applied.permissions.field[usage]},iam.plannerCapability);
  decorate(DatasetSecurityPlanService,['plan','assertCurrent']);decorate(Object.getPrototypeOf(iam.evaluator).constructor,['authorize','assertCurrent','assertPlannerCurrent']);const contracts=new ReleasedContracts(selection,applied.schemaCurrent),engine=contracts.createEngine(applied.orm,applied.resources,applied.guardPlanner(planner),applied.triggers);
  const verifier=(id:string,applicationId:string)=>new InternalVerifier(c.endpoints.data.actorAudience,[{issuer:id,keyId:id,publicKey:publicKeys[id],certificateFingerprint:c.peers.find((p:any)=>p.id===id).fingerprint,applications:[applicationId]}],directory,sessionCheck);
  const dataHandler=protectedDataHandler({authorityId:c.authorityId,verifier:verifier('runtime',c.applicationId),iam,contracts,engine,assets:new PrivateAssets(owner.root,(a,id,v)=>owner.lookup(a,id,v))});
  const canonical=await applied.inspect(),fields=canonical.schema.fields.filter((f:any)=>f.key==='name');if(fields.length!==1)throw new Error('NAME_FIELD_AMBIGUOUS');
  const witness=()=>digest(JSON.stringify({schema:schemaWitness([c.applied.paths.schemaPublications,c.applied.paths.schemaApplicationState,c.applied.paths.resourceRegistry]),owner:applicationOwnershipWitness(c.applicationRoot,c.applicationId)}));
  const templates=new InventoryPredicateTemplates(c.templateRegistry,{authorityId:c.authorityId,applicationId:c.applicationId,datasetId:canonical.resource.id,nameFieldId:fields[0].id,schemaIdentity:appliedIdentity(canonical),witness:witness()},witness,policy,iam,developmentSecurityScopes,developmentSecurityConfiguration,()=>holdResourceOwner(c.applied.paths.resourceRegistry));
  const administration=new SecurityAdministrationService(new SecurityDefinitionService(policy),iam.evaluator,iam.administrationIdentity,{async verify(){throw new Error('RECOVERY_NOT_AUTHORIZED');}},templates.scopes,{...developmentSecurityConfiguration,templateAuthority:templates.authority});
  const management=managementSecurityHandler({authorityId:c.authorityId,systemResourceId:'platform',managementApplicationId:c.managementApplicationId,iam,verifier:verifier('management',c.managementApplicationId),administration,
    applicationAdministratorPermissionId:developmentSecurityConfiguration.applicationAdministratorPermissionId,platformAdministratorPermissionId:developmentSecurityConfiguration.platformAdministratorPermissionId,policy,templates,administrationScopes:templates.scopes,
    revokeSessions:async(app,userId)=>{if(app!==c.applicationId)throw new Error('FOREIGN_APP');await client('runtime',['/sessions/revoke']).call('/sessions/revoke',{userId});}});
  await listen(createServer({...tls,requestCert:true,rejectUnauthorized:true},(req,res)=>req.url?.startsWith('/management/')?management(req,res):dataHandler(req,res)),c.endpoints.data.port);
  await listen(createServer({...tls,requestCert:true,rejectUnauthorized:true},serviceRpcHandler(new ServiceRpcVerifier(c.endpoints.data.rpcAudience,[peer('runtime',['/identity/resolve','/identity/current']),peer('management',['/identity/resolve','/identity/current'])]),identityOperations(directory))),c.endpoints.data.rpcPort);
  process.stdout.write(JSON.stringify({kind,pid:process.pid,ready:true})+'\n');
}else{
  const directory=new RemoteIdentityDirectory(client('data',['/identity/resolve','/identity/current'])),sessions=new SecureSessions(c.enrollmentApplicationId,c.clientId,c.origin,directory);
  const issued=[];for(const userId of c.sessionUsers){const enrollment=await directory.resolve(c.issuer,userId,c.enrollmentApplicationId),value=await sessions.issue(enrollment);issued.push({userId,cookie:value.cookie,token:value.token,csrf:value.csrf});}
  const statusServer=createServer({...tls,requestCert:true,rejectUnauthorized:true},serviceRpcHandler(new ServiceRpcVerifier(c.endpoints[kind].rpcAudience,[peer('data',['/sessions/status',...(kind==='runtime'?['/sessions/revoke']:[])])]),sessionOperations(sessions)));
  await listen(statusServer,c.endpoints[kind].rpcPort);
  // Authenticated channel failure injection through the parent test process, never a public route.
  process.on('message',async(message:any)=>{try{if(message.operation==='stop-status'){statusServer.closeAllConnections();await new Promise<void>(r=>statusServer.close(()=>r()));}else if(message.operation==='start-status')await listen(statusServer,c.endpoints[kind].rpcPort);else return;process.send?.({id:message.id,done:true});}catch{process.send?.({id:message.id,done:false});}});
  const manifest=JSON.parse(await readFile(c.publicManifest,'utf8')),files=new Map<string,any>();for(const f of manifest.files){const bytes=await readFile(path.join(c.publicRoot,f.file));if(digest(bytes)!==f.sha256)throw new Error('PUBLIC_RELEASE_CHANGED');files.set(f.route,{bytes,sha256:f.sha256,mediaType:f.mediaType});}
  const release={releaseId:c.releaseId,publicFiles:files};
  const signer=new InternalSigner(kind,kind,key,c.endpoints.data.actorAudience),transport=kind==='runtime'?new MtlsRuntimeTransport(c.endpoints.data.url,tls,signer):new MtlsManagementTransport(c.endpoints.data.url,tls,signer);
  const login={} as OidcLogin;
  const handler=kind==='runtime'?runtimeHandler({sessions,login,selected:async()=>release,transport}):managementFrontendHandler({sessions,login,transport,publicRelease:release,applicationId:k=>c.applicationKeys[k]});
  await listen(createServer(tls,handler),c.endpoints[kind].port);
  process.stdout.write(JSON.stringify({kind,pid:process.pid,ready:true,sessions:issued})+'\n');
}
