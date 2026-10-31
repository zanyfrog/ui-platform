import test from 'node:test';
import assert from 'node:assert/strict';
import '../mixed-page-admission/source.test.js';
import { mainContentRegion } from '../../src/client/visual-artifacts/main-content.js';
const region = (id:string, tag='section', name='Content') => `<${tag} data-uip-node="node-${id}" data-uip-region="${id}" data-uip-region-name="${name}">Shared default</${tag}>`;
test('guided main uses actual Region identity and readable display label',()=>{const main=mainContentRegion(region('region-main'));assert.equal(main.regionId,'region-main');assert.equal(main.displayName,'Content');assert.equal(main.content,'Shared default');});
test('semantic main Region preserves custom identity',()=>assert.equal(mainContentRegion(region('region-custom','main')).regionId,'region-custom'));
test('missing or ambiguous main refuses without label guessing',()=>{for(const source of ['',region('region-sidebar'),region('region-main')+region('region-custom','main')])assert.throws(()=>mainContentRegion(source));});
test('duplicate and malformed Regions refuse',()=>{assert.throws(()=>mainContentRegion(region('region-main')+region('region-main')));assert.throws(()=>mainContentRegion('<main data-uip-region="INVALID"></main>'));});
