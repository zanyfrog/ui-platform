import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const phase=process.argv[2];
if(!['before','after'].includes(phase))throw Error('Use before or after');
const output=path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/,'$1');
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const [name,root] of [['ui-platform','C:/Projects/Modular/ui-platform'],['data-services','C:/Projects/Modular/UI Platform Data Services']]){
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},maxBuffer:32*1024*1024});
 const records=text=>text.split('\0').filter(Boolean);
 const status=records(git('status','--porcelain=v1','-z','--untracked-files=all'));
 const ignored=records(git('ls-files','--others','--ignored','--exclude-standard','--directory','-z'));
 const tracked=records(git('ls-files','--stage','-z')).map(row=>{const [metadata,file]=row.split('\t');const [mode,objectId,stage]=metadata.split(' ');return{path:file,mode,objectId,stage:Number(stage)};});
 const head=git('rev-parse','HEAD').trim();
 const result={observedUtc:new Date().toISOString(),root,phase,branch:git('branch','--show-current').trim(),head,headTree:git('rev-parse','HEAD^{tree}').trim(),status,trackedCount:tracked.length,indexInventorySha256:hash(JSON.stringify(tracked)),ignored,ignoredInventoryMode:'Git directory-collapsed ignored paths; dependencies/caches are not traversed',branches:git('branch','-vv').trim(),refs:git('for-each-ref','--format=%(refname) %(objectname)','refs/heads','refs/remotes').trim().split('\n'),remote:git('remote','-v').trim().split('\n'),unstagedDiff:git('diff','--name-status').trim(),stagedDiff:git('diff','--cached','--name-status').trim(),recentCommits:git('log','-25','--date=iso-strict','--format=%H%x09%ad%x09%s').trim().split('\n'),qualification:'No fetch or remote service query; remote-tracking refs are cached local observations. No Git mutation command was invoked.'};
 if(name==='ui-platform'){
  result.pilotBaseline='94558ed';
  result.alreadyCommittedPilotProductAndTestPaths=git('diff','--name-status','94558ed..HEAD','--','src','packages','tests','scripts','package.json','package-lock.json','vendor').trim().split('\n');
  result.headFiles=git('diff-tree','--no-commit-id','--name-only','-r','HEAD').trim().split('\n');
 }
 fs.writeFileSync(path.join(output,`${name}-${phase}.json`),JSON.stringify(result,null,2));
 console.log(JSON.stringify({name,phase,branch:result.branch,head,status,tracked:tracked.length,ignoredPaths:ignored.length,stagedDiff:result.stagedDiff,unstagedDiff:result.unstagedDiff}));
}

