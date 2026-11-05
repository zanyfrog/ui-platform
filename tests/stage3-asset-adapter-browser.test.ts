import { it, expect } from 'vitest';
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

it('shared uploader and retained chooser use browser File, hash replacement and denial feedback', async () => {
  const evidence = path.resolve('evidence/v1-stage3-20261104'); await mkdir(evidence, { recursive: true });
  const vite = await createServer({ configFile: false, root: process.cwd(), server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'adapter-harness', configureServer(server) {
    server.middlewares.use('/stage3', (_req, res) => { res.setHeader('content-type', 'text/html'); res.end(`<div id="upload"></div><button id="choose">Choose image</button><output></output><script type="module">
import { mountCompositionUploader } from '/src/client/visual-artifacts/asset-upload-adapter.ts';
import { chooseApplicationImage } from '/src/client/visual-artifacts/image-selection.ts';
window.calls=[]; window.assets={}; window.denied=false;
const request=async(url,init)=>{window.calls.push({url,method:init?.method}); if(window.denied) throw Object.assign(Error('Permission revoked'),{status:403}); const p=new URL(url,location.origin).searchParams; if(init?.method==='POST'){const file=init.body.get('asset'); const path=init.body.get('path'); window.assets[path]={hash:'saved-hash',text:await file.text(),name:file.name}; return {path,hash:'saved-hash'};} if(p.has('list'))return {assets:Object.keys(window.assets)}; const path=p.get('path'); return {path,hash:window.assets[path]?.hash??null};};
mountCompositionUploader(document.querySelector('#upload'),'/api/apps/disposable/composition-asset',()=>request,()=>true,()=>{});
document.querySelector('#choose').onclick=async()=>{document.querySelector('output').textContent=await chooseApplicationImage('/api/apps/disposable',request,()=>true)??'Canceled';};
</script>`); });
  } }] });
  let browser;
  try {
    await vite.listen(); const playwright = createRequire(path.resolve('../ui-base/package.json'))('playwright');
    browser = await playwright.chromium.launch({ headless: false, channel: 'msedge' }); const page=await browser.newPage();
    await page.goto(vite.resolvedUrls!.local[0] + 'stage3');
    await page.locator('uib-asset-uploader input[type=file]').setInputFiles({name:'stage3.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="blue"/></svg>')});
    await page.getByRole('button',{name:'Create asset',exact:true}).click();
    await expect.poll(()=>page.locator('#upload [role=status]').textContent()).toContain('Saved assets/images/stage3.svg');
    expect(await page.evaluate(()=> (window as any).assets['assets/images/stage3.svg'].name)).toBe('stage3.svg');
    await page.screenshot({path:path.join(evidence,'shared-upload.png'),fullPage:true});
    await page.locator('#choose').click(); await page.getByRole('button',{name:'Use selected image',exact:true}).click();
    await expect.poll(()=>page.locator('output').textContent()).toBe('assets/images/stage3.svg');
    page.once('dialog',dialog=>dialog.dismiss()); await page.getByRole('button',{name:'Create asset',exact:true}).click();
    await expect.poll(()=>page.locator('#upload [role=status]').textContent()).toContain('Replacement canceled');
    await page.evaluate(()=>{(window as any).denied=true;}); await page.getByRole('button',{name:'Create asset',exact:true}).click();
    await expect.poll(()=>page.locator('#upload [role=status]').textContent()).toContain('Access denied');
    await page.screenshot({path:path.join(evidence,'permission-feedback.png'),fullPage:true});
    await writeFile(path.join(evidence,'adapter-browser.json'),JSON.stringify({qualification:'Real Edge browser File and shared component; test-double transport only. Does not qualify protected backend ownership or A1 end-to-end.',calls:await page.evaluate(()=>(window as any).calls)},null,2));
  } finally { await browser?.close(); await vite.close(); }
},60000);

