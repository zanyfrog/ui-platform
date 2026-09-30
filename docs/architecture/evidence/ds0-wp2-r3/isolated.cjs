const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const p=path.resolve(__dirname,'../../../..');
const cases=[['17-consumer-isolated',['packages/artifacts/tests/consumer-contract.test.ts']],['18-watcher-isolated',['packages/artifacts/tests/watcher.test.ts']]];
const results=[];
for(const [name,files] of cases){const args=['node_modules/vitest/vitest.mjs','run',...files],start=new Date().toISOString();console.log('Running '+name);const r=cp.spawnSync(process.execPath,args,{cwd:p,encoding:'utf8',maxBuffer:32*1024*1024});fs.writeFileSync(path.join(__dirname,name+'.txt'),'Command: node '+args.join(' ')+'\nStart: '+start+'\nExit: '+r.status+'\n'+r.stdout+r.stderr);results.push({name,cwd:p,args,start,end:new Date().toISOString(),exit:r.status});fs.writeFileSync(path.join(__dirname,'isolated-commands.json'),JSON.stringify(results,null,2));console.log(name+': '+r.status);if(r.status!==0)process.exitCode=1;}
