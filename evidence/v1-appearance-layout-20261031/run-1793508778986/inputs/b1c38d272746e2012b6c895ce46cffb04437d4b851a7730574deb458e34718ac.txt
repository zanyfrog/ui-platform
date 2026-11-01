import {chooseApplicationImage,isApplicationImage,uploadApplicationAsset,defaultAssetPath} from '../../src/client/visual-artifacts/image-selection.js';
declare global { interface Window { images:any } }
window.images={chooseApplicationImage,isApplicationImage,uploadApplicationAsset,defaultAssetPath};
