import {mountVisualArtifact} from '../../packages/visual-artifacts/src/runtime.js';
declare global { interface Window { anchors: {mount: typeof mountVisualArtifact} } }
window.anchors={mount:mountVisualArtifact};
