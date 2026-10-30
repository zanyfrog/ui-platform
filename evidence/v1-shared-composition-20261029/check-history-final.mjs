import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const inventory=JSON.parse(await fs.readFile('docs/architecture/v1-shared-website-composition-dependency-blocker-files-20261029.json','utf8'));
const checked=[];for(const r of inventory.untrackedPrimaryFiles){const hash=crypto.createHash('sha256').update(await fs.readFile(r.path)).digest('hex');assert.equal(hash,r.sha256,r.path);checked.push(r.path);}
await fs.writeFile('evidence/v1-shared-composition-20261029/history-preservation-final.json',JSON.stringify({passed:true,previousBlockerReportEvidenceAndVerificationFilesUnchanged:checked.length,checked},null,2));console.log('PASS '+checked.length+' original reports/evidence/verification files preserved');
