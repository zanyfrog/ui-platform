import { mountVisualEditor } from '../../src/client/visual-artifacts/editor.js';
import { configureAutosave } from '../../src/client/artifact-editor/autosave-configuration.js';
declare global { interface Window { guided: any } }
window.guided = { mount: mountVisualEditor, configureAutosave };
