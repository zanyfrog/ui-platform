import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=await fs.realpath('.'),evidence=path.join(root,'evidence/v1-stage5-wp3-integration-20261105');
const {target}=JSON.parse(await fs.readFile(path.join(evidence,'paths-and-inputs.json'),'utf8'));
const physical=await fs.realpath(target),data=await fs.realpath(path.join(path.dirname(physical),'UI Platform Data Services'));
if(!physical.startsWith(path.join(evidence,'disposable')+path.sep)||physical===root)throw Error('PHYSICAL_ISOLATION_REQUIRED');
const boundary=spawnSync(process.execPath,['scripts/check-stage5-boundaries.mjs'],{cwd:physical,encoding:'utf8',windowsHide:true,env:{...process.env,UI_PLATFORM_STAGE3_PHYSICAL_ROOT:physical,UI_PLATFORM_TEST_ORIGINAL_ROOT:root}});
if(boundary.status!==0)throw Error('BOUNDARY_CHECK_FAILED: '+boundary.stdout+boundary.stderr);
for(const [cwd,test,variable,originalVariable,original]of [[physical,'tests/stage5-integration.test.ts','UI_PLATFORM_STAGE3_PHYSICAL_ROOT','UI_PLATFORM_TEST_ORIGINAL_ROOT',root],[data,'packages/i-am/tests/wp3-template-contract.test.ts','UI_PLATFORM_DATA_PHYSICAL_ROOT','UI_PLATFORM_DATA_ORIGINAL_ROOT',path.resolve('../UI Platform Data Services')]]){
  await fs.mkdir(path.join(cwd,'diagnostics'),{recursive:true});
  for(const kind of ['missing','original']){
    const env={...process.env,[originalVariable]:original};delete env[variable];if(kind==='original')env[variable]=original;
    const output=path.join(cwd,'diagnostics/isolation-'+kind+'.json');
    const result=spawnSync(process.execPath,[path.join(cwd,'node_modules/vitest/vitest.mjs'),'run',test,'--reporter=json','--outputFile='+output],{cwd,env,encoding:'utf8',windowsHide:true});
    if(result.status===0||!(await fs.readFile(output,'utf8')).includes('PHYSICAL_ISOLATION_REQUIRED'))throw Error('ISOLATION_REFUSAL_MISSING');
  }
}
console.log('Production type/import checks passed; all four missing/original-root configurations refused before initialization.');
