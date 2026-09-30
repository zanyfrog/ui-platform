const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const p=path.resolve(__dirname,'../../../..'),d=path.resolve(p,'../UI Platform Data Services'),b=path.resolve(p,'../ui-base');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',f),'utf8').replace(/^\uFEFF/,''));
const calls=[];
function git(root,...args){const result=cp.spawnSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{encoding:null});calls.push({cwd:root,args,exit:result.status});if(result.status!==0)throw Error('Git read failed: '+args.join(' '));return result.stdout;}
const text=(root,...args)=>git(root,...args).toString('utf8').trim();
const prior=read('ds0-wp2-r3/preservation.json');
const records=[
 ['STAB-1','577683840535e668c2000f24562702e7b51c6a0b',read('ds0-stab-1/implementation-file-hashes.json')],
 ['STAB-2','d0aa1044b551086d2fbfaccf80357e7e6a5827dc',read('ds0-stab-2-implementation/preservation.json').changedFiles],
 ['STAB-3','9a6f0d5623863a8d44b879eda08316b0e3c79571',read('ds0-stab-3-implementation/preservation.json').implementationFiles],
 ['R1','07f11bc3ad16e249b97311be7641f1c91d48753e',read('ds0-wp2-r1/preservation.json').changedFiles],
 ['R2','d866b86d1fd7f2807ee3708a593b164930df156e',read('ds0-wp2-r2/preservation.json').changedFiles],
 ['R3','8b988af80ca5ce859a84791e4d63de5d00119a3b',prior.changedFiles]
];
const commits=records.map(([stage,commit,files])=>{
 git(d,'merge-base','--is-ancestor',commit,'HEAD');
 const committedPaths=text(d,'diff-tree','--no-commit-id','--name-only','-r',commit).split('\n').sort();
 const checks=files.map(item=>{
   const blob=git(d,'show',commit+':'+item.path),lf=blob.toString('utf8').replaceAll('\r\n','\n');
   const blobHash=hash(blob),crlfHash=hash(Buffer.from(lf.replaceAll('\n','\r\n')));
   const current=fs.readFileSync(path.join(d,item.path));
   let witness;
   if(hash(current)===item.sha256)witness=current;
   else for(let end=0;end<=current.length;end++)if(end===current.length||current[end]===10||current[end]===13){
     const prefix=current.subarray(0,end);if(hash(prefix)===item.sha256){witness=prefix;break;}
   }
   const witnessed=!!witness&&witness.toString('utf8').replaceAll('\r\n','\n')===lf;
   return {path:item.path,acceptedCheckoutSha256:item.sha256,gitBlobSha256:blobHash,crlfCheckoutSha256:crlfHash,
     match:blobHash===item.sha256?'exact-git-bytes':crlfHash===item.sha256?'CRLF-checkout-representation':
       witnessed?'accepted-current-bytes-or-prefix-normalize-to-commit':'historical-checkout-bytes-not-reconstructed'};
 });
 return{stage,commit,parent:text(d,'rev-parse',commit+'^'),ancestorOfHead:true,committedPaths,exactPathSet:JSON.stringify(committedPaths)===JSON.stringify(files.map(i=>i.path).sort()),checks};
});
git(d,'merge-base','--is-ancestor','313b7e0c64e8e93f75632bb9dc015614d7709668','HEAD');
const expected=new Map(prior.originalFiles.map(i=>[i.path,i.current]));
for(const i of prior.changedFiles)expected.set(i.path,i.sha256);
const source=[...expected].map(([file,accepted])=>({path:file,accepted,actual:hash(fs.readFileSync(path.join(d,file)))}));
const protectedList=[...prior.protectedEvidence.map(i=>({path:i.path,sha256:i.current})),...read('ds0-wp2-r3/artifact-hashes.json')];
const artifacts=[...new Map(protectedList.map(i=>[i.path,i])).values()].map(i=>({...i,actual:hash(fs.readFileSync(i.path))}));
const repos=[d,p,b].map(root=>({root,head:text(root,'rev-parse','HEAD'),branch:text(root,'branch','--show-current'),status:text(root,'status','--porcelain'),staged:text(root,'diff','--cached','--name-only'),lockfileSha256:hash(fs.readFileSync(path.join(root,'package-lock.json')))}));
const requiredFiles=['packages/orm/package.json','packages/orm/src/index.ts','packages/orm/src/types.ts','packages/orm/src/json-file-orm.ts','packages/dataset-operations/tests/recovery.test.ts','packages/dataset-operations/tests/support/activation-host.ts','packages/dataset-operations/tests/activation-http.test.ts','packages/dataset-operations/tests/activation-drain.test.ts'];
const interfaceReview=requiredFiles.map(file=>({path:file,sha256:hash(fs.readFileSync(path.join(d,file)))}));
const output={recordedAt:new Date().toISOString(),disposition:'Stopped for C2 evidence-gap review before fresh runtime validation',repositories:repos,commits,sourceInventory:source,protectedArtifacts:artifacts,interfaceReview,commands:calls,
 sourceMismatches:source.filter(i=>i.accepted!==i.actual),artifactMismatches:artifacts.filter(i=>i.sha256!==i.actual),historicalMismatches:commits.flatMap(c=>c.checks.filter(i=>i.match==='historical-checkout-bytes-not-reconstructed'))};
fs.writeFileSync(path.join(__dirname,'review.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({sourceFiles:source.length,sourceMismatches:output.sourceMismatches.length,protectedArtifacts:artifacts.length,artifactMismatches:output.artifactMismatches.length,commitPathSets:commits.map(c=>({stage:c.stage,files:c.checks.length,exact:c.exactPathSet})),historicalMismatches:output.historicalMismatches.length,repositories:repos},null,2));
if(output.sourceMismatches.length||output.artifactMismatches.length||output.historicalMismatches.length||commits.some(c=>!c.exactPathSet))process.exitCode=1;
