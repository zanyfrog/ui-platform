const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const d=path.resolve(__dirname,'../../../../../UI Platform Data Services');
const args=['node_modules/typescript/bin/tsc','--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','packages/dataset-operations/tests/activation-http.test.ts'];
const runs=[['04-c2-strict',args],['05-c2-focused',['node_modules/vitest/vitest.mjs','run','packages/dataset-operations/tests/activation-http.test.ts','-t','C2']]];
const results=[];
for(const [name,args] of runs){const start=new Date().toISOString();const r=cp.spawnSync(process.execPath,args,{cwd:d,encoding:'utf8',maxBuffer:32*1024*1024});fs.writeFileSync(path.join(__dirname,name+'.txt'),'Command: node '+args.join(' ')+'\nCWD: '+d+'\nStart: '+start+'\nExit: '+r.status+'\n'+r.stdout+r.stderr);results.push({name,args,cwd:d,start,end:new Date().toISOString(),exit:r.status});fs.writeFileSync(path.join(__dirname,'c2-commands.json'),JSON.stringify(results,null,2));console.log(name+': '+r.status);if(r.status!==0){process.exitCode=1;break;}}
