import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const evidence='evidence/v1-stage5-integration-20261105',out=evidence+'/predicate-contract';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
if(git('rev-parse','HEAD')!=='d3729a13c8312d35be4fe61b784f84f9e3bd4446'||git('branch','--show-current')!=='main')throw Error('BASELINE_DISCREPANCY');
const target=(await read(evidence+'/security-only/paths-and-inputs.json')).target;
if(await fs.realpath(target)===await fs.realpath('.'))throw Error('PHYSICAL_ISOLATION_REQUIRED');
const probeSource=await fs.readFile('tests/stage5-predicate-contract.test.ts');
if(!probeSource.equals(await fs.readFile(path.join(target,'tests/stage5-predicate-contract.test.ts'))))throw Error('PROBE_INPUT_MISMATCH');
await fs.mkdir(out,{recursive:true});
const probe=await read(path.join(target,'diagnostics/predicate-contract/result.json')),tests=await read(path.join(target,'diagnostics/predicate-contract/tests.json'));
if(tests.numPassedTests!==1||tests.numFailedTests!==0)throw Error('PROBE_FAILED');
await fs.copyFile(path.join(target,'diagnostics/predicate-contract/result.json'),out+'/result.json');
await fs.copyFile(path.join(target,'diagnostics/predicate-contract/tests.json'),out+'/tests.json');
const before=await read(evidence+'/preservation-before.json');let componentFiles=0,packageFiles=0;
for(const [relative,expected]of Object.entries(before.files)){if(relative.split(/[\\/]/).includes('.uib'))throw Error('FORBIDDEN_GRAPH_METADATA');if(hash(await fs.readFile(relative))!==expected)throw Error('COMPONENT_DISCREPANCY');componentFiles++;}
for(const pkg of await read(evidence+'/package-closure.json'))for(const [relative,expected]of Object.entries(pkg.files)){if(hash(await fs.readFile(path.join(pkg.source,relative)))!==expected)throw Error('PACKAGE_DISCREPANCY');packageFiles++;}
const dataFiles={};for(const relative of ['types.ts','graph.ts','service.ts']){const file='../UI Platform Data Services/packages/i-am/src/wp3/'+relative;dataFiles[file]=hash(await fs.readFile(file));}
const repositories={};for(const repository of ['../UI Platform Data Services','../ui-base']){if(git('-C',repository,'status','--porcelain'))throw Error('REPOSITORY_DISCREPANCY');repositories[repository]=git('-C',repository,'rev-parse','HEAD');}
await fs.writeFile(out+'/inspection.json',JSON.stringify({status:'STOPPED: exact WP3 contract extension requires separate approval',physicalTarget:target,probeInputSha256:hash(await fs.readFile('tests/stage5-predicate-contract.test.ts')),probe,sourceInspection:dataFiles,
  delegationObservation:'Source inspection only: checkChange constructs synthetic allow rules for grant-boundary permissions without predicateTemplateIds; no new live delegation exploit test claimed',
  preservation:{componentFiles,packageFiles,unchangedRepositories:repositories,historicalLockAccess:'No historical lock read/acquire/recovery/recreation/mutation in this continuation'},
  productionAdapterImplemented:false,workflowResumed:false,priorRegressionResultsUnchanged:{passed:42,failed:1,skipped:1},committed:false,pushed:false},null,2));
console.log(JSON.stringify({structuralDiagnosticPassed:1,componentFiles,packageFiles,status:'STOPPED'}));
