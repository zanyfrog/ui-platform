import {it,expect} from 'vitest';
import {realpath,mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
it('observes staggered independent Node peers across restart and a minute-long anchor interval',async()=>{
 const root=process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT,original=process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT;
 if(!root||!original||await realpath('.')!==await realpath(root)||await realpath(root)===await realpath(original))throw Error('PHYSICAL_ISOLATION_REQUIRED');
 const probe=spawn(process.execPath,['tests/fixtures/stage5-clock-qualification.mjs'],{cwd:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe']});let output='',errors='';probe.stdout!.on('data',b=>output+=String(b));probe.stderr!.on('data',b=>errors+=String(b));const code=await new Promise(resolve=>{probe.once('error',e=>{throw e;});probe.once('exit',resolve);});expect(code,errors).toBe(0);const result=JSON.parse(output);await mkdir('diagnostics',{recursive:true});await writeFile('diagnostics/extended-clock.json',JSON.stringify(result,null,2));expect(result.peers).toHaveLength(4);expect(result.elapsedMs).toBeGreaterThanOrEqual(80000);for(const p of result.peers)expect(p.count).toBeGreaterThan(0);
},150000);
