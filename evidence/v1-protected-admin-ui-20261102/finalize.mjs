import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const before=JSON.parse(fs.readFileSync(path.join(here,'before.json'),'utf8'));
const after=JSON.parse(fs.readFileSync(path.join(here,'after.json'),'utf8'));
const current=new Map(after.files.map(f=>[f.path,f.sha256]));
const comparison={existingFiles:before.files.length,changedFiles:before.files.filter(f=>current.get(f.path)!==f.sha256).map(f=>f.path),
  registrationsUnchanged:JSON.stringify(before.registrations)===JSON.stringify(after.registrations),securityTablesUnchanged:JSON.stringify(before.tables)===JSON.stringify(after.tables)};
comparison.changedFileDetails = comparison.changedFiles.map(file => {
  const old = before.files.find(f => f.path === file), next = after.files.find(f => f.path === file);
  const bytes = fs.readFileSync(file);
  return { path: file, appendedBytesAtSnapshot: next.bytes - old.bytes,
    originalPrefixPreserved: createHash('sha256').update(bytes.subarray(0, old.bytes)).digest('hex') === old.sha256 };
});
fs.writeFileSync(path.join(here,'comparison.json'),JSON.stringify(comparison,null,2));
const entry=file=>({path:file,bytes:fs.statSync(file).size,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
const sources=['src/client/artifact-editor/identity-selector.ts','src/client/artifact-editor/pilot-administration.ts','src/shared/pilot-administration.ts','src/server/v1-development-identity.ts','tests/pilot-administration.test.ts',
  'docs/architecture/v1-local-pilot-protected-administrative-ui-integration-review-gate-20261102.md'];
fs.writeFileSync(path.join(here,'source-files.json'),JSON.stringify(sources.map(entry),null,2));
fs.writeFileSync(path.join(here,'files.json'),JSON.stringify(fs.readdirSync(here).filter(n=>n!=='files.json').map(n=>entry(path.join(here,n))),null,2));
console.log(JSON.stringify(comparison));
