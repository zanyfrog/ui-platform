const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const p=path.resolve(__dirname,'../../../..'),source=fs.readFileSync(path.join(p,'scripts/check-editor-contracts.mjs'),'utf8');
const files=[...source.matchAll(/'([^']+\.test\.ts)'/g)].map(m=>m[1]);
if(files.length!==13)throw Error('Unexpected contract selection');
const args=['node_modules/vitest/vitest.mjs','run',...files,'--no-file-parallelism'],start=new Date().toISOString();
const r=cp.spawnSync(process.execPath,args,{cwd:p,encoding:'utf8',maxBuffer:32*1024*1024});
fs.writeFileSync(path.join(__dirname,'19-platform-contracts-serial.txt'),'Command: node '+args.join(' ')+'\nStart: '+start+'\nExit: '+r.status+'\n'+r.stdout+r.stderr);
fs.writeFileSync(path.join(__dirname,'serial-command.json'),JSON.stringify({cwd:p,args,start,end:new Date().toISOString(),exit:r.status},null,2));
console.log('Serialized diagnostic: exit '+r.status);if(r.status!==0)process.exitCode=1;
