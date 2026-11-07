import { it, expect } from 'vitest';
import { realpath, mkdir, writeFile,mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { developmentSecurityScopes } from '../src/server/v1-security-administration.js';
import { V1_AUTHORITY_ID } from '../src/server/v1-development-policy.js';
import { schemaWitness,holdResourceOwner } from '../src/server/production/predicate-templates.js';

// Direct compiled contract check; the browser journey separately exercises the real adapter.
it('passes full rule and granting context and refuses an expression-only predicate adapter', async () => {
  const target=process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT,original=process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT;
  if(!target||!original||await realpath('.')!==await realpath(target)||await realpath(target)===await realpath(original))throw Error('PHYSICAL_ISOLATION_REQUIRED');
  const require=createRequire(import.meta.url),entry=require.resolve('@ui-platform/i-am/administration');
  if(!(await realpath(entry)).startsWith(path.dirname(await realpath(target))+path.sep))throw Error('UNISOLATED_DATA');
  const {boundaryAllowsRule}=await import(pathToFileURL(path.join(path.dirname(entry),'graph.js')).href);
  const applicationId='contract-probe-app',datasetId='contract-probe-dataset',fieldId='contract-probe-permanent-name-field',templateId='inventory.exclude-hidden.v1';
  const scope={resource:{authorityId:V1_AUTHORITY_ID,applicationId,kind:'dataset',id:datasetId},descendants:true};
  const where={op:'eq',left:{kind:'field',fieldId},right:{kind:'literal',value:'Hidden'}};
  const permission={permissionId:'dataset.read',scope,predicateTemplateIds:[templateId]};
  const boundary={kind:'grant-boundary',id:'approved-boundary',status:'active',scope,permissions:[permission]};
  const calls:any[]=[];
  const scopes={...developmentSecurityScopes,permitsTemplateRule(input:any){calls.push(input);return input.boundary.id==='approved-boundary'&&input.permission.predicateTemplateIds.length===1&&input.permission.predicateTemplateIds[0]===templateId&&input.rule.effect==='deny'&&input.rule.permissionId==='dataset.read'&&JSON.stringify(input.rule.scope)===JSON.stringify(scope)&&JSON.stringify(input.rule.where)===JSON.stringify(where);}};
  const rule={id:'restriction',permissionId:'dataset.read',effect:'deny',scope,where};
  expect(boundaryAllowsRule([boundary],rule,undefined,scopes)).toBe(true);
  expect(boundaryAllowsRule([boundary],{...rule,effect:'allow'},undefined,scopes)).toBe(false);
  expect(calls[0].rule.effect).toBe('deny');expect(calls[1].rule.effect).toBe('allow');expect(calls[0].permission).toBe(permission);expect(calls[0].boundary).toBe(boundary);
  expect(boundaryAllowsRule([{...boundary,id:'different-boundary'}],rule,undefined,scopes)).toBe(false);
  expect(boundaryAllowsRule([boundary],rule,undefined,{...developmentSecurityScopes,permitsPredicate:()=>true})).toBe(false);
  expect(boundaryAllowsRule([{...boundary,permissions:[{...permission,predicateTemplateIds:['unknown-template']}]}],rule,undefined,scopes)).toBe(false);
  expect(boundaryAllowsRule([boundary],{...rule,where:{...where,left:{kind:'field',fieldId:'unauthorized-field'}}},undefined,scopes)).toBe(false);
  expect(boundaryAllowsRule([boundary],rule,undefined,developmentSecurityScopes)).toBe(false);
  const report={purpose:'Direct compiled WP3 contract check; separate from the real browser/adapter journey',syntheticLocatorsOnly:true,
    callbackContext:['rule','boundary','permission','assignmentScope'],denyAccepted:true,allowRefused:true,wrongBoundaryRefused:true,expressionOnlyAdapterRefused:true,
    unknownTemplateRefused:true,wrongFieldRefused:true,acceptedDevelopmentAdapterStillRefuses:true};
  await mkdir('diagnostics/predicate-contract',{recursive:true});await writeFile('diagnostics/predicate-contract/result.json',JSON.stringify(report,null,2));
});

it('binds logical owner state across WAL checkpoints and holds competing owner writes until release',async()=>{
  const target=process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT,original=process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT;
  if(!target||!original||await realpath('.')!==await realpath(target)||await realpath(target)===await realpath(original))throw Error('PHYSICAL_ISOLATION_REQUIRED');
  const root=await mkdtemp(path.join(tmpdir(),'stage5-owner-witness-')),file=path.join(root,'owner.sqlite');
  const owner=new DatabaseSync(file);let competing:DatabaseSync|undefined;
  try{
    owner.exec("PRAGMA journal_mode=WAL;CREATE TABLE resource_state(key TEXT PRIMARY KEY,revision INTEGER);INSERT INTO resource_state VALUES('active',1);CREATE TABLE resources(id TEXT PRIMARY KEY,status TEXT);INSERT INTO resources VALUES('dataset','active');CREATE TABLE resource_history(id TEXT,revision INTEGER);");
    const before=schemaWitness([file]);owner.exec('PRAGMA wal_checkpoint(TRUNCATE)');expect(schemaWitness([file])).toBe(before);
    competing=new DatabaseSync(file);competing.exec('PRAGMA busy_timeout=0');const lease=holdResourceOwner(file);
    try{expect(()=>competing!.exec("UPDATE resources SET status='retired'")).toThrow();expect(schemaWitness([file])).toBe(before);}finally{lease.release();}
    competing.exec("UPDATE resources SET status='retired';UPDATE resource_state SET revision=2");expect(schemaWitness([file])).not.toBe(before);
  }finally{competing?.close();owner.close();await rm(root,{recursive:true,force:true});}
});
