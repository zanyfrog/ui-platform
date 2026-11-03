import fs from 'node:fs';
import path from 'node:path';
import{createHash}from'node:crypto';
const entries=[];
function walk(root,relative=''){for(const name of fs.readdirSync(path.join(root,relative))){const local=path.join(relative,name),full=path.join(root,local),stat=fs.lstatSync(full);if(stat.isSymbolicLink()){entries.push({path:local.replaceAll('\\','/'),type:'link',target:fs.readlinkSync(full)});}else if(stat.isDirectory()){entries.push({path:local.replaceAll('\\','/'),type:'directory'});walk(root,local);}else if(stat.isFile()){entries.push({path:local.replaceAll('\\','/'),type:'file',bytes:stat.size,sha256:createHash('sha256').update(fs.readFileSync(full)).digest('hex')});}}}
walk('node_modules');entries.sort((a,b)=>a.path.localeCompare(b.path));fs.writeFileSync(new URL(`./tree-${process.argv[2]}.json`,import.meta.url),JSON.stringify(entries,null,2));console.log(JSON.stringify({entries:entries.length,files:entries.filter(e=>e.type==='file').length,links:entries.filter(e=>e.type==='link').length}));
