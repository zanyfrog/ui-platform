// Local qualification process composition only. No provider substitute or production launcher.
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:https';
import { readRuntimeWitness } from './runtime-serving-witness.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { X509Certificate } from 'node:crypto';
import { bootstrapDevelopmentDataset, inspectDevelopmentDataset } from '@ui-platform/dataset-operations';
import { LocalDirectoryDeploymentTarget } from '../../packages/artifacts/src/application/local-target.js';
import { DeploymentService } from '../../packages/artifacts/src/application/deployment.js';
import { fingerprint } from '../../packages/artifacts/src/application/common.js';
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
import { DurableReleaseSelection } from '../../src/server/production/durable-release-selection.js';
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
const client=(id:string,paths:string[],timeoutMs?:number)=>new ServiceRpcClient(c.endpoints[id].rpc,tls,kind,kind,key,c.endpoints[id].rpcAudience,paths,timeoutMs);
const listen=async(server:any,port:number)=>new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
let promotionScope: { fingerprint:string; signal:AbortSignal; used:boolean } | undefined;
const releaseTarget = kind !== 'management' && c.deploymentRoot
  ? new LocalDirectoryDeploymentTarget({
    root: c.deploymentRoot,
    async health(_release, manifest, phase) {
      if (kind !== 'data' || phase === 'promoted' || fingerprint(manifest) !== c.approvedReleaseTransition?.manifestFingerprint) throw Error('RELEASE_TARGET_NOT_APPROVED');
    },
    // Runtime reads the durable pointer per request. Only Data owns transitions.
    async activate() { if (kind !== 'data') throw Error('RELEASE_READER_MUTATION_DENIED'); },
    async oldRuntimeCompatible() { return false; },
    authorizePromotion(manifestFingerprint) {
      const scope = promotionScope;
      if (kind !== 'data' || !scope || scope.used || scope.fingerprint !== manifestFingerprint) throw Error('CONTROLLED_TRANSITION_REQUIRED');
      scope.signal.throwIfAborted();
      scope.used = true;
      return () => {
        if (promotionScope !== scope) throw Error('CONTROLLED_TRANSITION_ENDED');
        scope.signal.throwIfAborted();
      };
    },
  }) : undefined;
const durable = releaseTarget ? new DurableReleaseSelection(releaseTarget, c.applicationRoot, c.applicationId, c.schemaIdentity) : undefined;
if(kind==='data'){
  let admitting = false;
  const operations = new Set<Promise<void>>();
  const admission = {
    close() { admitting = false; if(c.drainWitness && operations.size)process.send?.({witness:'admission-closed',inFlight:operations.size}); },
    async drain() { await Promise.allSettled(operations); },
    open() { admitting = true; },
    isOpen() { return admitting; },
  };
  let recovery: Awaited<ReturnType<LocalDirectoryDeploymentTarget['captureControlledRecovery']>> | undefined;
  let transitionApproval = c.approvedReleaseTransition;
  const writerWitnesses: unknown[] = [];
  let rollbackObservations: unknown[]|undefined;
  const retained = c.retainDataOwner ? await (async () => {
    const canonical = await inspectDevelopmentDataset(c.applied);
    const app = JSON.parse(await readFile(path.join(c.applicationRoot, 'app.manifest.json'), 'utf8'));
    if (app.appId !== c.applicationId || canonical.resource.applicationId !== c.applicationId) throw Error('DATA_OWNER_APPLICATION_MISMATCH');
    return bootstrapDevelopmentDataset({
      owner: { applicationIdForKey: key => key === path.basename(c.applicationRoot) ? app.appId : undefined, isCurrentOwner: id => id === app.appId },
      authorityId: c.authorityId, systemResourceId: c.applied.systemResourceId ?? 'platform',
      applicationKey: path.basename(c.applicationRoot), root: path.dirname(c.applied.paths.resourceRegistry),
      registration: c.applied.registration, schema: canonical.schema, restartPin: c.applied.pin,
      retainServingOwner: { admission, transition: {
        recovery: (c.approvedReleaseTransition || c.approvedReleaseTransitionFile) ? {
          async capture({ signal }) {
            signal.throwIfAborted();
            if (!durable || !releaseTarget) throw Error('DURABLE_RELEASE_REQUIRED');
            const selected = await durable.observe();
            if (selected.composition.schemaIdentity !== appliedIdentity(canonical)) throw Error('RELEASE_SCHEMA_MISMATCH');
            const prior = await releaseTarget.captureControlledRecovery(c.applicationId, transitionApproval.manifestFingerprint,
              async manifest => fingerprint(manifest) === selected.binding.manifestFingerprint);
            if (prior.binding.manifestFingerprint !== selected.binding.manifestFingerprint) throw Error('RECOVERY_CAPTURE_MISMATCH');
            signal.throwIfAborted();
            recovery = prior;
            return { releaseId: selected.composition.releaseId, manifestFingerprint: prior.binding.manifestFingerprint.replace(/^sha256:/,'') };
          },
          async restore({ previous, signal }) {
            const prior = recovery;
            recovery = undefined;
            if (!prior || prior.binding.manifestFingerprint !== 'sha256:' + previous.manifestFingerprint) throw Error('RECOVERY_CAPTURE_MISMATCH');
            await prior.restore(signal);
          },
        } : undefined,
        async verifyRelease(probe) {
        if (!durable) throw Error('DURABLE_RELEASE_REQUIRED');
        const selected = await durable.observe();
        const applied = await probe.inspectApplied();
        const bundle = selected.publicRelease.publicFiles.get('/application.js');
        if (!bundle || selected.composition.releaseId !== probe.expectedReleaseId ||
            selected.composition.schemaIdentity !== appliedIdentity(canonical) ||
            applied.schema.verificationFingerprint !== probe.schemaFingerprint ||
            applied.schema.runtimeGeneration !== probe.dataGeneration || !applied.binding.bindingDigest) throw Error('RELEASE_SCHEMA_MISMATCH');
        const response = await readRuntimeWitness({
          endpoint:c.endpoints.runtime.url,ca:tls.ca,pin:c.peers.find((p:any)=>p.id==='runtime').fingerprint,
          signal:probe.signal,releaseId:probe.expectedReleaseId,manifest:selected.binding.manifestFingerprint,
          bundleHash:bundle.sha256,bundleLength:bundle.bytes.length,
        });
        const current = await durable.observe();
        probe.signal.throwIfAborted();
        if (response.releaseId !== probe.expectedReleaseId || response.manifest !== selected.binding.manifestFingerprint ||
            current.binding.release !== selected.binding.release || current.binding.buildId !== selected.binding.buildId ||
            current.binding.manifestFingerprint !== selected.binding.manifestFingerprint ||
            current.composition.releaseId !== selected.composition.releaseId) throw Error('RUNTIME_DATA_RELEASE_MISMATCH');
        rollbackObservations?.push({releaseId:response.releaseId,manifestFingerprint:response.manifest,bundleSha256:bundle.sha256,
          schemaFingerprint:applied.schema.verificationFingerprint,registry:applied.binding,admissionOpen:admission.isOpen()});
        if(c.writerWitness){
          const code=`
            import { createRequire } from 'node:module';
            import { pathToFileURL } from 'node:url';
            import { DatabaseSync } from 'node:sqlite';
            const c=JSON.parse(process.argv[1]), req=createRequire(import.meta.url);
            const owner=createRequire(req.resolve('@ui-platform/dataset-operations'));
            const load=name=>import(pathToFileURL(owner.resolve(name)).href);
            const {EnvironmentSchemaStateStore}=await load('@ui-platform/schema-application');
            const {SchemaManager}=await load('@ui-platform/schema-manager');
            const refusal=async fn=>{try{await fn();return 'MUTATION_SUCCEEDED';}catch(e){return e.code??'UNKNOWN';}};
            const state=new EnvironmentSchemaStateStore({root:c.paths.schemaApplicationState,environmentId:c.pin.environmentId});
            const publications=new SchemaManager(c.paths.schemaPublications);
            const db=new DatabaseSync(c.paths.resourceRegistry);db.exec('PRAGMA busy_timeout=0');
            try{
              console.log(JSON.stringify({pid:process.pid,
                state:await refusal(()=>state.markRecoveryRequired({appId:c.pin.appId,datasetId:c.pin.datasetId,reason:'isolated competing writer'})),
                publication:await refusal(()=>publications.publishDraft(c.pin.reference)),
                registry:await refusal(()=>{try{db.exec("UPDATE resource_state SET revision=revision+1 WHERE key='active'");}
                  catch(error){if(/locked/i.test(error.message))throw Object.assign(Error('registry locked'),{code:'REGISTRY_LOCKED'});throw error;}})}));
            }finally{db.close();}
          `;
          const {stdout}=await promisify(execFile)(process.execPath,['--input-type=module','-e',code,JSON.stringify({paths:c.applied.paths,pin:c.applied.pin})],
            {cwd:process.cwd(),windowsHide:true,signal:probe.signal,timeout:8_000});
          const writers=JSON.parse(stdout);
          if(writers.state!=='SCHEMA_APPLICATION_LOCKED'||writers.publication!=='SCHEMA_PUBLICATION_LOCKED'||writers.registry!=='REGISTRY_LOCKED')
            throw Error('COMPETING_WRITER_EXCLUSION_FAILED');
          const after=await probe.inspectApplied();
          if(JSON.stringify(after)!==JSON.stringify(applied))throw Error('COMPETING_WRITER_STATE_CHANGED');
          writerWitnesses.push({releaseId:selected.composition.releaseId,manifestFingerprint:selected.binding.manifestFingerprint,
            bundleSha256:bundle.sha256,admissionOpen:admission.isOpen(),schemaFingerprint:applied.schema.verificationFingerprint,registry:applied.binding,writers});
        }
        if (c.recoveryWitness && transitionApproval) {
          if (selected.composition.releaseId === transitionApproval.releaseId) {
            c.recoveryWitnessRejectedB = true;
            throw Error('TEST_B_VERIFICATION_REFUSAL');
          }
          if (c.recoveryWitness === 'uncertain' && c.recoveryWitnessRejectedB) throw Error('TEST_A_RECOVERY_VERIFICATION_REFUSAL');
        }
        return { challenge: probe.challenge, runtimeReleaseId: response.releaseId, dataReleaseId: selected.composition.releaseId,
          schemaFingerprint: applied.schema.verificationFingerprint, dataGeneration: applied.schema.runtimeGeneration,
          runtimeManifestFingerprint: response.manifest.replace(/^sha256:/,''), dataManifestFingerprint: selected.binding.manifestFingerprint.replace(/^sha256:/,'') };
      } } },
    });
  })() : undefined;
  const policy=new SecurityDefinitionStore(c.policyFile),directory=iamIdentityDirectory(c.enrollmentFile,policy,async()=>{throw new Error('OPERATOR_ONLY');});
  const owner=await PrivateAssetOwner.open(c.privateRoot,c.publicRoots),selection=durable ?? new ApplicationPublicationSelection(c.applicationRoot,c.applicationId,c.schemaIdentity);
  const applied=await openAppliedData(retained ? {...c.applied, serving:retained.serving} : c.applied,async ref=>{
    if(ref.kind==='artifact'&&ref.id===c.privateAssetId)return !!await owner.lookup(c.applicationId,c.privateAssetId,c.privateVersion);
    const release=await selection.read();
    for(const file of Object.keys(release.files).filter(f=>f.endsWith('.visual.json'))){const m=JSON.parse(await readFile(path.join(release.compositionRoot,file),'utf8'));if((m.componentId??m.artifactId)===ref.id)return true;}
    return false;
  }, retained?.servingOwner);
  if(c.drainWitness){
    let releaseCommit: (()=>void)|undefined;
    let armed=false;
    process.on('message',(message:any)=>{
      if(message.operation==='arm-drain'){armed=true;process.send?.({witness:'drain-armed'});}
      if(message.operation==='release-commit')releaseCommit?.();
    });
    const begin=applied.orm.beginTransaction.bind(applied.orm);
    applied.orm.beginTransaction=async()=>{
      const transaction=await begin();
      if(armed){
        armed=false;
        const commit=transaction.commit.bind(transaction);
        transaction.commit=async()=>{
          await new Promise<void>(resolve=>{releaseCommit=resolve;process.send?.({witness:'commit-held',transactionId:transaction.id});});
          releaseCommit=undefined;
          await commit();
          process.send?.({witness:'commit-settled',transactionId:transaction.id,outcome:'committed'});
        };
      }
      return transaction;
    };
  }
  const sessionCheck=remoteSessionStatus(new Map([[c.applicationId,client('runtime',['/sessions/status'])],[c.managementApplicationId,client('management',['/sessions/status'])]]));
  const policyAuthority={async read(){const s=policy.snapshot();return{revision:String(s.revision),documents:s.documents};}},iam=currentIam(policyAuthority,applied.resources,directory,sessionCheck,{freshnessMs:15_000});
  const planner=new DatasetSecurityPlanService(applied.resources,iam.evaluator,policyAuthority,iam.identity,{operation:id=>c.applied.permissions.operation[id],field:usage=>c.applied.permissions.field[usage]},iam.plannerCapability);
  const contracts=new ReleasedContracts(selection,applied.schemaCurrent),engine=contracts.createEngine(applied.orm,applied.resources,applied.guardPlanner(planner),applied.triggers);
  const verifier=(id:string,applicationId:string)=>new InternalVerifier(c.endpoints.data.actorAudience,[{issuer:id,keyId:id,publicKey:publicKeys[id],certificateFingerprint:c.peers.find((p:any)=>p.id===id).fingerprint,applications:[applicationId]}],directory,sessionCheck);
  const dataHandler=protectedDataHandler({authorityId:c.authorityId,verifier:verifier('runtime',c.applicationId),iam,contracts,engine,assets:new PrivateAssets(owner.root,(a,id,v)=>owner.lookup(a,id,v))});
  const canonical=await applied.inspect(),fields=canonical.schema.fields.filter((f:any)=>f.key==='name');if(fields.length!==1)throw new Error('NAME_FIELD_AMBIGUOUS');
  const witness=()=>digest(JSON.stringify({schema:schemaWitness([c.applied.paths.schemaPublications,c.applied.paths.schemaApplicationState,c.applied.paths.resourceRegistry]),owner:applicationOwnershipWitness(c.applicationRoot,c.applicationId)}));
  const templates=new InventoryPredicateTemplates(c.templateRegistry,{authorityId:c.authorityId,applicationId:c.applicationId,datasetId:canonical.resource.id,nameFieldId:fields[0].id,schemaIdentity:appliedIdentity(canonical),witness:witness()},witness,policy,iam,developmentSecurityScopes,developmentSecurityConfiguration,()=>holdResourceOwner(c.applied.paths.resourceRegistry));
  const administration=new SecurityAdministrationService(new SecurityDefinitionService(policy),iam.evaluator,iam.administrationIdentity,{async verify(){throw new Error('RECOVERY_NOT_AUTHORIZED');}},templates.scopes,{...developmentSecurityConfiguration,templateAuthority:templates.authority});
  const management=managementSecurityHandler({authorityId:c.authorityId,systemResourceId:'platform',managementApplicationId:c.managementApplicationId,iam,verifier:verifier('management',c.managementApplicationId),administration,
    applicationAdministratorPermissionId:developmentSecurityConfiguration.applicationAdministratorPermissionId,platformAdministratorPermissionId:developmentSecurityConfiguration.platformAdministratorPermissionId,policy,templates,administrationScopes:templates.scopes,
    revokeSessions:async(app,userId)=>{if(app!==c.applicationId)throw new Error('FOREIGN_APP');await client('runtime',['/sessions/revoke']).call('/sessions/revoke',{userId});}});
  const protectedServer=createServer({...tls,requestCert:true,rejectUnauthorized:true},(req,res)=>{
    if(retained && !admission.isOpen()) {res.writeHead(503).end();return;}
    const operation=(req.url?.startsWith('/management/')?management:dataHandler)(req,res);
    operations.add(operation);
    void operation.catch(()=>res.destroy()).finally(()=>operations.delete(operation));
  });
  await listen(protectedServer,c.endpoints.data.port);
  if(retained?.servingOwner) process.once('disconnect',async()=>{
    try {await retained.servingOwner!.shutdown();process.exit(0);}
    catch {process.exit(1);}
  });
  const identityPaths = ['/identity/resolve','/identity/current'];
  const transitionPath = '/deployment/activate-approved';
  const rollbackPath = '/deployment/rollback-approved';
  const operationsRpc = identityOperations(directory);
  const hasApproval = c.approvedReleaseTransition || c.approvedReleaseTransitionFile;
  let transitionOperation: Record<string,(value:unknown, serviceId:string)=>Promise<unknown>> = {};
  if (hasApproval) {
    if (!retained?.servingOwner || !releaseTarget || !durable) throw Error('RETAINED_DEPLOYMENT_REQUIRED');
    const controller = retained.servingOwner.controller, target = releaseTarget;
    let consumed = false;
    transitionOperation = { async [transitionPath](value, serviceId) {
    if (serviceId !== 'management' || consumed) throw Error('DEPLOYMENT_REQUEST_DENIED');
    const approved = c.approvedReleaseTransition ?? JSON.parse(await readFile(c.approvedReleaseTransitionFile,'utf8'));
    const request = value as Record<string,unknown> | null;
    if (consumed || !request || Object.keys(request).length !== 4 ||
        request.planId !== approved.planId || request.applicationId !== c.applicationId ||
        request.buildId !== approved.buildId || request.manifestFingerprint !== approved.manifestFingerprint) throw Error('DEPLOYMENT_REQUEST_DENIED');
    consumed = true;
    if(c.transitionNegativeWitness)process.send?.({witness:'transition-consumed'});
    transitionApproval = approved;
    c.approvedReleaseTransition = approved;
    const { MigrationEngine, JsonFileMigrationProvider, FileSystemArtifactService } = await import('@ui-platform/artifacts');
    const provider = new JsonFileMigrationProvider({
      environmentRoot: c.deploymentRoot, environmentId: c.applied.pin.environmentId, production: false,
      dataRoot: c.applied.paths.ormData, datasetFiles: approved.datasetFiles,
      async setMaintenance() { throw Error('SCHEMA_MIGRATION_NOT_AUTHORIZED'); },
    });
    const migrations = new MigrationEngine({ root: c.applicationRoot, applicationId: c.applicationId,
      service: new FileSystemArtifactService({root:c.applicationRoot}), provider, async authorize() { return false; } });
    const deployment = new DeploymentService({ root: c.applicationRoot, applicationId: c.applicationId, migrations, target,
      async environment() { return {}; },
      async authorize(approval) { return approval.planId === approved.planId && approval.actorId === 'management' && !approval.destructive && !approval.force; },
      async controlledPromotion({ manifest, promote }) {
        if (manifest.buildId !== approved.buildId || fingerprint(manifest) !== approved.manifestFingerprint) throw Error('DEPLOYMENT_CANDIDATE_NOT_APPROVED');
        // Deployment already holds its provider lock; neither this callback nor recovery reenters it.
        return controller.withQuiescedServingOwner(approved.releaseId, async signal => {
          if (promotionScope || !recovery) throw Error('CONTROLLED_RECOVERY_REQUIRED');
          promotionScope = {fingerprint:approved.manifestFingerprint,signal,used:false};
          try { await promote(signal); }
          finally { promotionScope = undefined; }
        }, approved.manifestFingerprint.slice('sha256:'.length));
      },
    });
      const record = await deployment.deploy(approved.planId, { planId: approved.planId, actorId: serviceId, destructive: false });
      return { deploymentId: record.deploymentId, state: record.state, outcome: record.transition?.outcome,
        ...(c.writerWitness?{writerWitnesses,admissionOpen:admission.isOpen(),caller:serviceId,failure:record.transition?.failure}:{}),
        ...(c.recoveryWitness ? { failure:record.transition?.failure, admissionOpen:admission.isOpen() } : {}) };
    } };
    if(c.approvedRollbackFile){
      let rollbackConsumed=false;
      transitionOperation[rollbackPath]=async(value,serviceId)=>{
        if(serviceId!=='management'||rollbackConsumed)throw Error('ROLLBACK_REQUEST_DENIED');
        const approved=JSON.parse(await readFile(c.approvedRollbackFile,'utf8'));
        const request=value as Record<string,unknown>|null;
        if(rollbackConsumed||!request||Object.keys(request).length!==4||request.applicationId!==c.applicationId||
            request.planId!==approved.planId||request.buildId!==approved.buildId||request.manifestFingerprint!==approved.manifestFingerprint)throw Error('ROLLBACK_REQUEST_DENIED');
        const readPrior=()=>new DurableReleaseSelection({readVerifiedActive:id=>target.readVerifiedPrior(id)},c.applicationRoot,c.applicationId,c.schemaIdentity).observe();
        const compatible=async()=>{
          const prior=await readPrior();
          if(prior.composition.releaseId!==approved.releaseId||prior.binding.buildId!==approved.buildId||
              prior.binding.manifestFingerprint!==approved.manifestFingerprint||prior.composition.schemaIdentity!==approved.schemaIdentity)
            throw Error('ROLLBACK_SCHEMA_OR_BINDING_MISMATCH');
        };
        rollbackConsumed=true;
        try{await compatible();}catch{return {outcome:'incompatible',admissionOpen:admission.isOpen()};}
        transitionApproval=approved;
        recovery=undefined;
        rollbackObservations=[];
        if(approved.failVerification)c.recoveryWitness='uncertain';
        try{
          const result=await controller.withQuiescedServingOwner(approved.releaseId,async signal=>{
            if(promotionScope||!recovery)throw Error('CONTROLLED_RECOVERY_REQUIRED');
            await compatible();
            promotionScope={fingerprint:approved.manifestFingerprint,signal,used:false};
            try{await target.promoteControlledPrior(c.applicationId,approved.manifestFingerprint);}
            finally{promotionScope=undefined;}
          },approved.manifestFingerprint.slice('sha256:'.length));
          return {outcome:result.outcome,admissionOpen:admission.isOpen(),caller:serviceId,observations:rollbackObservations};
        }catch(error){
          return {outcome:'recovery-required',admissionOpen:admission.isOpen(),caller:serviceId,observations:rollbackObservations,
            failure:error instanceof Error?error.message:'ROLLBACK_FAILED'};
        }finally{rollbackObservations=undefined;}
      };
    }
  }
  let deploymentBusy=false;
  for(const [route,operation] of Object.entries(transitionOperation)){
    transitionOperation[route]=async(value,serviceId)=>{
      if(deploymentBusy)throw Error('DEPLOYMENT_TRANSITION_BUSY');
      deploymentBusy=true;
      try{return await operation(value,serviceId);}
      finally{deploymentBusy=false;}
    };
  }
  await listen(createServer({...tls,requestCert:true,rejectUnauthorized:true},serviceRpcHandler(new ServiceRpcVerifier(c.endpoints.data.rpcAudience,
    [peer('runtime',identityPaths),peer('management',[...identityPaths,...Object.keys(transitionOperation)])]),
    {...operationsRpc,...transitionOperation})),c.endpoints.data.rpcPort);
  process.stdout.write(JSON.stringify({kind,pid:process.pid,ready:true,...(retained ? {
    serving:retained.serving, schemaIdentity:appliedIdentity(canonical), registryRevision:canonical.registryRevision,
  } : {})})+'\n');
}else{
  const directory=new RemoteIdentityDirectory(client('data',['/identity/resolve','/identity/current'])),sessions=new SecureSessions(c.enrollmentApplicationId,c.clientId,c.origin,directory);
  const issued=[];for(const userId of c.sessionUsers){const enrollment=await directory.resolve(c.issuer,userId,c.enrollmentApplicationId),value=await sessions.issue(enrollment);issued.push({userId,cookie:value.cookie,token:value.token,csrf:value.csrf});}
  const statusServer=createServer({...tls,requestCert:true,rejectUnauthorized:true},serviceRpcHandler(new ServiceRpcVerifier(c.endpoints[kind].rpcAudience,[peer('data',['/sessions/status',...(kind==='runtime'?['/sessions/revoke']:[])])]),sessionOperations(sessions)));
  await listen(statusServer,c.endpoints[kind].rpcPort);
  // Authenticated channel failure injection through the parent test process, never a public route.
  process.on('message',async(message:any)=>{try{
    if(message.operation==='activate-approved' && kind==='management' && c.controlledDeployment){
      const result=await client('data',['/deployment/activate-approved'],33_000).call('/deployment/activate-approved',message.approval);
      process.send?.({id:message.id,done:true,result});return;
    }
    if(message.operation==='rollback-approved' && c.rollbackWitness){
      const route='/deployment/rollback-approved';
      const result=await client('data',[route],33_000).call(route,message.approval);
      process.send?.({id:message.id,done:true,result});return;
    }
    if(message.operation==='negative-transition' && c.transitionNegativeWitness){
      const route='/deployment/activate-approved';
      const rpc=message.wrongAudience ? new ServiceRpcClient(c.endpoints.data.rpc,tls,kind,kind,key,
        c.endpoints.management.rpcAudience,[route]) : client('data',[route]);
      const result=await rpc.call(route,message.approval);
      process.send?.({id:message.id,done:true,result});return;
    }
    if(message.operation==='identity-audience-witness' && c.transitionNegativeWitness){
      const route='/identity/resolve';
      const rpc=new ServiceRpcClient(c.endpoints.data.rpc,tls,kind,kind,key,
        message.wrongAudience || c.endpoints.data.rpcAudience,[route]);
      await rpc.call(route,message.approval);
      process.send?.({id:message.id,done:true});return;
    }
    if(message.operation==='stop-status'){statusServer.closeAllConnections();await new Promise<void>(r=>statusServer.close(()=>r()));}else if(message.operation==='start-status')await listen(statusServer,c.endpoints[kind].rpcPort);else return;process.send?.({id:message.id,done:true});}catch{process.send?.({id:message.id,done:false});}});
  const manifest=JSON.parse(await readFile(c.publicManifest,'utf8')),files=new Map<string,any>();for(const f of manifest.files){const bytes=await readFile(path.join(c.publicRoot,f.file));if(digest(bytes)!==f.sha256)throw new Error('PUBLIC_RELEASE_CHANGED');files.set(f.route,{bytes,sha256:f.sha256,mediaType:f.mediaType});}
  const release={releaseId:c.releaseId,publicFiles:files};
  const signer=new InternalSigner(kind,kind,key,c.endpoints.data.actorAudience),transport=kind==='runtime'?new MtlsRuntimeTransport(c.endpoints.data.url,tls,signer):new MtlsManagementTransport(c.endpoints.data.url,tls,signer);
  const login={} as OidcLogin;
  const handler=kind==='runtime'?runtimeHandler({sessions,login,selected:async()=>durable ? (await durable.readPublic()).publicRelease : release,transport}):managementFrontendHandler({sessions,login,transport,publicRelease:release,applicationId:k=>c.applicationKeys[k]});
  const servingServer=createServer(tls,handler);
  await listen(servingServer,c.endpoints[kind].port);
  process.once('disconnect',()=>{
    void Promise.all([servingServer,statusServer].map(server=>new Promise<void>((resolve,reject)=>{
      server.close(error=>error&&error.code!=='ERR_SERVER_NOT_RUNNING'?reject(error):resolve());
      server.closeIdleConnections();
    }))).then(()=>process.exit(0),()=>process.exit(1));
  });
  process.stdout.write(JSON.stringify({kind,pid:process.pid,ready:true,sessions:issued})+'\n');
}
