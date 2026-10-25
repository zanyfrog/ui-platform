import { mountVisualEditor } from '../../src/client/visual-artifacts/editor.js';
import { configureAutosave } from '../../src/client/artifact-editor/autosave-configuration.js';

const metadata = { schemaVersion:1, artifactId:'art_memory_parser', kind:'page', name:'memory-parser', displayName:'Memory parser', route:'/' };
const initial = '<!-- keep -->\n<div class="uip-layout-item" data-uip-node="wrap"><p data-uip-node="saved">Saved text</p></div>';
// Test instrumentation hashes authored memory strings in the admitted Node driver.
const digest = (text:string):Promise<string> => (window as any).memoryDigest(text);
let editor: Awaited<ReturnType<typeof mountVisualEditor>>, host:HTMLElement, calls:unknown[] = [], start=0;
const source = () => host.querySelector<HTMLTextAreaElement>('[data-source]')!;
(window as any).parserHarness = {
  async mount(enabled:boolean) {
    configureAutosave({enabled,delayMs:2000}); calls=[];start=Date.now();
    host=document.createElement('section');document.body.append(host);
    const bundle={locator:'memory/page.visual.json',files:{source:initial,css:'p { color: red; }',metadata:JSON.stringify(metadata),fixtures:'{}',code:''},hash:await digest(initial),diagnostics:[],metadata};
    const request=async (url:string,init?:RequestInit) => {
      if(init?.method!=='PUT')throw Error('UNEXPECTED_MEMORY_ACQUISITION '+url);
      const body=JSON.parse(String(init.body));calls.push({url,method:init.method,body,time:Date.now()-start});
      if(body.expectedHash!==bundle.hash)throw Error('MEMORY_CHECKSUM_CHANGED');
      bundle.files=structuredClone(body.files);bundle.hash=await digest(JSON.stringify(bundle.files));
      return structuredClone(bundle);
    };
    editor=await mountVisualEditor(host,'memory-route',{workspace:{pages:[bundle as any],components:[],shells:[],packages:[]},initial:{kind:'page',locator:bundle.locator},applicationId:'memory-permanent-app',request:request as any,captureRequest:()=>request as any});
    editor.focus({pages:[bundle as any],components:[],shells:[],packages:[]});
  },
  async snapshot() {
    const select=host.querySelector<HTMLSelectElement>('[data-nodes]')!;
    return {source:source().value,checksum:await digest(source().value),file:host.querySelector<HTMLSelectElement>('[data-file]')!.value,range:[source().selectionStart,source().selectionEnd],state:editor.state(),ids:[...select.options].map(o=>o.value),selected:select.value,undo:!host.querySelector<HTMLButtonElement>('[data-undo]')!.disabled,redo:!host.querySelector<HTMLButtonElement>('[data-redo]')!.disabled,calls:structuredClone(calls)};
  },
  selectSaved() {const select=host.querySelector<HTMLSelectElement>('[data-nodes]')!;select.value='saved';select.dispatchEvent(new Event('change'));},
  async dispose(){await editor.dispose();host.remove();},
};
