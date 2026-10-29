import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'evidence/v1-shared-composition-20261029','run-'+Date.now());
await fs.mkdir(out,{recursive:true});
process.env.SHARED_COMPOSITION_TEST_ROOT=path.join(out,'fixture');
const boundary=path.join(root,'tests/shared-composition/boundaries.ts');
const result=await build({absWorkingDir:root,entryPoints:['tests/shared-composition/service.ts'],bundle:true,write:false,platform:'node',format:'esm',packages:'external',metafile:true,plugins:[{name:'detached-owners',setup(b){b.onResolve({filter:/.*/},a=>{
 if(a.importer.includes(path.join('src','server'))&&['applications','paths','trash','component-registry'].includes(path.basename(a.path,'.js'))) return {path:boundary};
});}}]});
await fs.writeFile(path.join(out,'inputs.json'),JSON.stringify(result.metafile,null,2));
const entry=path.join(out,'service.mjs');await fs.writeFile(entry,result.outputFiles[0].text);
try {const service=await import(pathToFileURL(entry).href); const results=await service.verify(); await fs.writeFile(path.join(out,'result.json'),JSON.stringify(results,null,2));console.log('PASS '+out);}
catch(error){await fs.writeFile(path.join(out,'failure.txt'),error.stack);throw error;}
