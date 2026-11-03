import fs from 'node:fs';
import path from 'node:path';
import{createHash}from'node:crypto';
const here=new URL('./',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,here),'utf8'));
const before=read('before.json'),after=read('after.json'),files=new Map(after.files.map(f=>[f.path,f.sha256]));
const dependencies=JSON.parse(fs.readFileSync('evidence/v1-shared-native-installation-20261103/dependency-files.json','utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const baseline=read('baseline.json'),log=fs.readFileSync('evidence/v1-shared-native-installation-20261103/startup.log','utf8');
const optimizerLines=log.split(/\r?\n/).filter(l=>l.includes('dependency optimized')||l.includes('optimized dependencies changed'));
const result={applicationFiles:before.files.length,changedFiles:before.files.filter(f=>files.get(f.path)!==f.sha256).map(f=>f.path),addedFiles:after.files.filter(f=>!before.files.some(b=>b.path===f.path)).map(f=>f.path),
 securityTablesUnchanged:JSON.stringify(before.tables)===JSON.stringify(after.tables),registrationsUnchanged:JSON.stringify(before.registrations)===JSON.stringify(after.registrations),
 dependencyRecordsAndArchiveUnchanged:dependencies.every(d=>hash(d.path)===d.sha256),optimizerLinesUnchanged:JSON.stringify(optimizerLines)===JSON.stringify(baseline.optimizerReloadLines),runtimeLogBytes:Buffer.byteLength(log),optimizerLines};
result.changedFileDetails=result.changedFiles.map(p=>{const old=before.files.find(f=>f.path===p),next=after.files.find(f=>f.path===p);return{path:p,beforeSha256:old.sha256,afterSha256:next.sha256,appendedBytes:next.bytes-old.bytes,originalPrefixPreserved:createHash('sha256').update(fs.readFileSync(p).subarray(0,old.bytes)).digest('hex')===old.sha256};});
fs.writeFileSync(new URL('preservation.json',here),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
