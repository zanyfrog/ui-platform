import{changeAppearance,readAppearance}from'../../src/client/visual-artifacts/appearance-css.js';
import{layoutControls}from'../../src/client/visual-artifacts/style-controls.js';
declare global{interface Window{appearance:any}}
window.appearance={changeAppearance,readAppearance,layoutControls};
