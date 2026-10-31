import '../anchor-navigation/browser.js';
import {createVisualPage} from '../../packages/visual-artifacts/src/runtime.js';
import {registerManagedVisualGraph} from '../../packages/visual-artifacts/src/revision-guard.js';
declare global {interface Window {mixed:{create:typeof createVisualPage;register:typeof registerManagedVisualGraph}}}
window.mixed={create:createVisualPage,register:registerManagedVisualGraph};
