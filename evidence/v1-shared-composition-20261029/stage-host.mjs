import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const project='C:/Projects/Modular/v1-normal-smoke-20261026-01/ui-platform';
const host=path.join(project,'references/visual-artifacts-host-20261028');
const output=path.resolve('evidence/v1-shared-composition-20261029');
const original=await fs.readFile(path.join(host,'vite.config.ts'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
await fs.writeFile(path.join(output,'before',hash(original)),original);
const manifestPath=path.join(project,'node_modules/@ui-base/ui/ui.component.json');
const installed=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const input=path.join(host,'.inputs/ui-base');await fs.mkdir(input,{recursive:true});
const entries=installed.components.filter(c=>['uib-card','uib-panel'].includes(c.tagName));
if(entries.length!==2) throw Error('Required native contracts missing');
const pkg=await fs.readFile(path.join(project,'node_modules/@ui-base/ui/package.json'));
await fs.writeFile(path.join(input,'package.json'),pkg);
await fs.writeFile(path.join(input,'ui.component.json'),JSON.stringify({components:entries.map(c=>({...c,module:path.relative(input,path.resolve(path.dirname(manifestPath),c.module)).replaceAll('\\','/')}))},null,2));
const pins=[];
async function pin(file){const bytes=await fs.readFile(file);pins.push({file,sha256:hash(bytes)});}
// Pin the installed native dependency bytes; no installer or source-root change.
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})) {if(entry.isSymbolicLink())throw Error('Native package symlink refused');const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(entry.isFile())await pin(file);}}
await walk(path.join(project,'node_modules/@ui-base'));
await pin(path.join(input,'package.json'));await pin(path.join(input,'ui.component.json'));
await fs.writeFile(path.join(host,'.inputs/composition-pins.json'),JSON.stringify(pins,null,2));
await fs.writeFile(path.join(output,'host-inputs.json'),JSON.stringify({beforeConfig:hash(original),manifestPath,manifestHash:hash(await fs.readFile(manifestPath)),contracts:entries.map(c=>c.identity?.componentId??'@ui-base/ui:'+c.tagName),pins},null,2));
let source=original.toString();
source=source.replace("import {visualArtifacts}","import {applicationComposition,visualArtifacts}");
source=source.replace("import fs from 'node:fs';","import fs from 'node:fs';\nimport {createHash} from 'node:crypto';");
source=source.replace("export default defineConfig",`const pins=JSON.parse(fs.readFileSync(path.join(root,'.inputs/composition-pins.json'),'utf8')) as Array<{file:string;sha256:string}>;
function verifyNative(file:string){const pin=pins.find(p=>path.resolve(p.file).toLowerCase()===path.resolve(file).toLowerCase());if(!pin)throw Error('Unadmitted native package input: '+file);if(fs.lstatSync(file).isSymbolicLink()||fs.realpathSync(file).toLowerCase()!==path.resolve(file).toLowerCase()||createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==pin.sha256)throw Error('Native package input changed: '+file);}
for(const pin of pins)verifyNative(pin.file);
const nativeInputs={name:'bounded-composition-native-inputs',enforce:'pre' as const,load(id:string){const file=id.split('?')[0];if(file.replaceAll('\\\\','/').toLowerCase().includes('/node_modules/@ui-base/'))verifyNative(file);}};
export default defineConfig`);
source=source.replace(".vite-cache-multipage-20261028",".vite-cache-composition-20261029");
source=source.replace("plugins:[visualArtifacts({applicationRoot,componentsRoot,packageManifests:[]})]","plugins:[nativeInputs,visualArtifacts({applicationRoot,componentsRoot,packageManifests:[]}),applicationComposition({root:applicationRoot,sharedComponentsRoot:componentsRoot,packageManifests:[path.join(root,'.inputs/ui-base/ui.component.json')]})]");
await fs.writeFile(path.join(host,'vite.composition-staged.txt'),source);
const main=await fs.readFile(path.join(host,'src/main.ts'),'utf8');await fs.writeFile(path.join(output,'before',hash(Buffer.from(main))),main);
const focused=main.replace("const target = root?.querySelector<HTMLElement>('h1') ?? root?.querySelector<HTMLElement>('main,section');","const pageRoot = root?.querySelector('[data-uip-region=\"region-main\"]')?.firstElementChild?.shadowRoot ?? root;\n    const target = pageRoot?.querySelector<HTMLElement>('h1') ?? pageRoot?.querySelector<HTMLElement>('main,section');");
await fs.writeFile(path.join(host,'main.composition-staged.txt'),focused);
console.log('Host configuration staged only; existing host configuration unchanged.');
