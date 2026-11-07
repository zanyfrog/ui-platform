import { DatabaseSync } from 'node:sqlite';
import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { actorAdministrativePaths, type AdministrationConfiguration, type AdministrationScopeAuthority } from '@ui-platform/i-am/administration';
import type { SecurityDefinitionStore, SecurityScope } from '@ui-platform/i-am/definitions';
import type { currentIam } from './current-iam.js';
import { deny, digest, exact, identifier } from './boundary.js';

export const inventoryTemplateId='inventory.exclude-hidden.v1';
export interface InventoryTemplateBinding {authorityId:string;applicationId:string;datasetId:string;nameFieldId:string;schemaIdentity:string;witness:string}
/** Synchronous witness of canonical schema/publication/ownership files, never Dataset records.
 * Initial semantic verification is supplied by the existing applied owner inspector. */
export function schemaWitness(roots:string[]):string {
  const files:Record<string,string>={};
  const walk=(file:string)=>{if(!path.isAbsolute(file)||realpathSync(file)!==path.resolve(file))deny();const info=lstatSync(file);if(info.isSymbolicLink())deny();if(info.isDirectory())for(const name of readdirSync(file).sort())walk(path.join(file,name));else if(!file.endsWith('-shm'))files[file]=digest(readFileSync(file));};
  for(const root of roots){
    if(!root.endsWith('.sqlite')){walk(root);continue;}
    if(!path.isAbsolute(root)||realpathSync(root)!==path.resolve(root)||(lstatSync(root)).isSymbolicLink())deny();
    // WAL checkpoints and reader initialization can change physical SQLite bytes
    // without changing the owner revision. Bind the actual consistent logical state.
    const owner=new DatabaseSync(root,{readOnly:true});try{owner.exec('BEGIN');files[root]=digest(JSON.stringify({state:owner.prepare('SELECT * FROM resource_state ORDER BY key').all(),resources:owner.prepare('SELECT * FROM resources ORDER BY id').all(),history:owner.prepare('SELECT * FROM resource_history ORDER BY revision,id').all(),schema:owner.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all()}));owner.exec('COMMIT');}finally{owner.close();}
  }
  return digest(JSON.stringify(files));
}
export function applicationOwnershipWitness(root:string,applicationId:string):string {
  if(realpathSync(root)!==path.resolve(root))deny();
  const files=['app.manifest.json','app.settings.json'].map(name=>path.join(root,name));
  for(const file of files)if(realpathSync(file)!==file||lstatSync(file).isSymbolicLink())deny();
  const app=JSON.parse(readFileSync(files[0]!,'utf8')),settings=JSON.parse(readFileSync(files[1]!,'utf8'));
  if(app.appId!==applicationId||settings.application?.status!=='active')deny();
  return digest(JSON.stringify({root,applicationId,status:settings.application.status}));
}
export function holdResourceOwner(file:string):{release():void}{
  if(!path.isAbsolute(file)||realpathSync(file)!==path.resolve(file)||lstatSync(file).isSymbolicLink())deny();
  const owner=new DatabaseSync(file);try{owner.exec('PRAGMA busy_timeout=0;BEGIN IMMEDIATE');}catch(error){owner.close();throw error;}
  return{release(){try{owner.exec('ROLLBACK');}finally{owner.close();}}};
}
const same=(a:unknown,b:unknown)=>digest(JSON.stringify(a))===digest(JSON.stringify(b));
/** One finite registry. Registration is an independent current Platform capability action;
 * it never adds a policy permission or makes an empty WP3 ceiling usable for a rule. */
export class InventoryPredicateTemplates {
  private readonly db:DatabaseSync;
  readonly scopes:AdministrationScopeAuthority;
  readonly authority:NonNullable<AdministrationConfiguration['templateAuthority']>;
  private readonly appScope:SecurityScope;
  constructor(file:string,private readonly binding:InventoryTemplateBinding,private readonly witness:()=>string,
    private readonly policy:SecurityDefinitionStore,private readonly iam:ReturnType<typeof currentIam>,private readonly base:AdministrationScopeAuthority,
    private readonly config:AdministrationConfiguration,private readonly holdOwner:()=>{release():void}){
    if(!path.isAbsolute(file)||![binding.applicationId,binding.datasetId,binding.nameFieldId].every(identifier))deny();
    this.db=new DatabaseSync(file);this.db.exec(`PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS templates(id TEXT PRIMARY KEY,body TEXT NOT NULL,active INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS template_audit(seq INTEGER PRIMARY KEY AUTOINCREMENT,action TEXT NOT NULL,actor TEXT NOT NULL,body TEXT NOT NULL);`);
    this.appScope={resource:{authorityId:binding.authorityId,applicationId:binding.applicationId,kind:'application',id:binding.applicationId},descendants:true};
    this.scopes={contains:(a,b)=>base.contains(a,b),permitsPredicate:()=>false,permitsTemplateRule:input=>{
      const row=this.current(),r=input.rule;
      return !!row&&row.boundaryId===input.boundary.id&&same(row.beneficiary,input.boundary.beneficiary)&&input.permission.predicateTemplateIds.length===1&&input.permission.predicateTemplateIds[0]===inventoryTemplateId&&
        same(input.permission.scope,this.appScope)&&r.permissionId==='dataset.read'&&r.effect==='deny'&&!r.fields?.length&&same(r.scope,{resource:{authorityId:binding.authorityId,applicationId:binding.applicationId,kind:'dataset',id:binding.datasetId},descendants:true})&&
        same(r.where,{op:'eq',left:{kind:'field',fieldId:binding.nameFieldId},right:{kind:'literal',value:'Hidden'}})&&(!input.assignmentScope||same(input.assignmentScope,this.appScope));
    }};
    this.authority={capture:()=>{if(!this.current())deny();return this.revision();},assertCurrent:stamp=>{
      // A registry writer cannot revoke/replace authority between this check and
      // the enclosing WP3 policy transaction's commit or rollback.
      this.db.exec('BEGIN IMMEDIATE');let owner:{release():void}|undefined;
      try{owner=this.holdOwner();if(!this.current()||stamp!==this.revision()){owner.release();owner=undefined;this.db.exec('ROLLBACK');return false;}const lease=owner;return{release:()=>{try{lease.release();}finally{this.db.exec('ROLLBACK');}}};}catch(error){try{owner?.release();}finally{this.db.exec('ROLLBACK');}throw error;}
    },permitsDelegation:input=>{
      const row=this.current();if(!row||input.proposed.id!==row.boundaryId||!same(row.beneficiary,input.proposed.beneficiary)||!same(input.proposed.scope,this.appScope))return false;
      // Explicit registry authority is restricted to the actual Platform path recorded at registration.
      if(!input.paths.some(p=>p.boundary.id===row.sourceBoundaryId&&p.via.assignmentId===row.sourceAssignmentId))return false;
      return input.proposed.permissions.every(p=>!p.predicateTemplateIds.length||p.permissionId==='dataset.read'&&same(p.scope,this.appScope)&&p.predicateTemplateIds.length===1&&p.predicateTemplateIds[0]===inventoryTemplateId);
    }};
  }
  private revision(){return digest(JSON.stringify(this.db.prepare('SELECT * FROM templates ORDER BY id').all()));}
  private current():any {if(this.witness()!==this.binding.witness)return undefined;const row=this.db.prepare('SELECT body FROM templates WHERE id=? AND active=1').get(inventoryTemplateId);if(!row)return undefined;const value=JSON.parse(String(row.body));return same(value.binding,this.binding)?value:undefined;}
  async register(context:object,input:unknown){
    exact(input,['templateId','boundaryId','applicationId','datasetId','fieldId','schemaIdentity','reason']);
    const b=this.binding;if(input.templateId!==inventoryTemplateId||input.applicationId!==b.applicationId||input.datasetId!==b.datasetId||input.fieldId!==b.nameFieldId||input.schemaIdentity!==b.schemaIdentity||!input.reason?.trim()||this.witness()!==b.witness)deny();
    const root={authorityId:b.authorityId,applicationId:null,kind:'system' as const,id:this.config.systemResourceId};
    const assert=await this.iam.authorize(context,this.config.platformAdministratorPermissionId,root),actor=await this.iam.administrationIdentity.verify(context),snapshot=this.policy.snapshot();
    const paths=actorAdministrativePaths(snapshot.documents.map(d=>d.definition),actor.actorId,new Date(),{resource:root,descendants:false},this.config.platformAdministratorPermissionId,'activate',this.base,b.authorityId);
    const boundary=snapshot.documents.find(d=>d.definition.kind==='grant-boundary'&&d.definition.id===input.boundaryId)?.definition;
    if(!paths.length||boundary?.kind!=='grant-boundary'||boundary.status!=='active'||boundary.scope.resource.applicationId!==b.applicationId||boundary.scope.resource.kind!=='application'||boundary.scope.resource.id!==b.applicationId)deny();
    const application=snapshot.documents.find(d=>d.definition.kind==='application-security'&&d.definition.id===b.applicationId)?.definition;
    const beneficiary=snapshot.documents.find(d=>d.definition.id===boundary.beneficiary.id)?.definition;
    if(application?.kind!=='application-security'||application.status!=='active'||!beneficiary||!['role','group'].includes(beneficiary.kind)||!('owner'in beneficiary)||beneficiary.owner.kind!=='application'||beneficiary.owner.applicationId!==b.applicationId)deny();
    const hasExistingAdministrativePath=snapshot.documents.filter(d=>d.definition.kind==='user'&&d.definition.status==='active').some(d=>actorAdministrativePaths(snapshot.documents.map(v=>v.definition),d.definition.id,new Date(),{resource:this.appScope.resource,descendants:false},application.requiredAdministratorPermissionId,'activate',this.base,b.authorityId).some(p=>p.boundary.id===boundary.id));
    if(!hasExistingAdministrativePath)deny();
    await assert();if(snapshot.revision!==this.policy.revision()||this.witness()!==b.witness)deny();
    const body={binding:b,boundaryId:boundary.id,beneficiary:boundary.beneficiary,sourceBoundaryId:paths[0]!.boundary.id,sourceAssignmentId:paths[0]!.via.assignmentId,registeredBy:actor.actorId,reason:input.reason};
    this.db.exec('BEGIN IMMEDIATE');try{if(this.db.prepare('SELECT id FROM templates WHERE id=?').get(inventoryTemplateId))deny();this.db.prepare('INSERT INTO templates VALUES(?,?,1)').run(inventoryTemplateId,JSON.stringify(body));this.db.prepare('INSERT INTO template_audit(action,actor,body) VALUES(?,?,?)').run('register',actor.actorId,JSON.stringify(body));this.db.exec('COMMIT');}catch(error){this.db.exec('ROLLBACK');throw error;}
    return {templateId:inventoryTemplateId,registered:true,registryRevision:this.revision()};
  }
  async revoke(context:object,input:unknown){exact(input,['templateId','reason']);if(input.templateId!==inventoryTemplateId||!input.reason?.trim())deny();const b=this.binding;const assert=await this.iam.authorize(context,this.config.platformAdministratorPermissionId,{authorityId:b.authorityId,applicationId:null,kind:'system',id:this.config.systemResourceId});const actor=await this.iam.administrationIdentity.verify(context);await assert();this.db.exec('BEGIN IMMEDIATE');try{this.db.prepare('UPDATE templates SET active=0 WHERE id=?').run(inventoryTemplateId);this.db.prepare('INSERT INTO template_audit(action,actor,body) VALUES(?,?,?)').run('revoke',actor.actorId,JSON.stringify(input));this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}return {revoked:true};}
  audit(){return this.db.prepare('SELECT seq,action,actor,body FROM template_audit ORDER BY seq').all();}
  close(){this.db.close();}
}
