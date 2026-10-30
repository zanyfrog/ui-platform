import fs from 'node:fs/promises';
// Values transcribed from the successful normal-Chrome readPreview tool outputs.
// This is explicitly a transcript, not a new browser execution or API capture.
const observed=[
 ['Final saved Home','Home','Home','home','f2466614e82345bf73282b49088dd5a937044542373162b80600b06c82397dda'],
 ['Mouse About','About','About us','about','7e9f83ef426cf2ffa53ccebeff4e9c6e242283f4a1563efb098d8a674c800740'],
 ['Keyboard Contact','Contact','Contact','contact','2dd519468e79167c9cd771848dbd6bc412a372274fbd960c04da5113efee10d5'],
 ['Iframe Back About','About','About us','about','7e9f83ef426cf2ffa53ccebeff4e9c6e242283f4a1563efb098d8a674c800740'],
 ['Iframe Forward Contact','Contact','Contact','contact','2dd519468e79167c9cd771848dbd6bc412a372274fbd960c04da5113efee10d5'],
].map(([label,heading,current,name,revision])=>({label,heading,current:[current],branding:'V1 Development Identity Fixture',footer:'Built together: three Pages, one shared Shell.',parentUrl:'http://localhost:5374/',frameUrl:'http://localhost:5374/visual-preview.html?'+new URLSearchParams({app:'v1-identity-fixture',locator:name+'/page.visual.json',revision,kind:'page',design:'1',page:'/'+name})}));
await fs.writeFile('evidence/v1-shared-composition-20261029/normal-composed-preview-transcript.json',JSON.stringify({origin:'Transcribed from successful CUA normal-Chrome tool outputs in this conversation, before automation stalled after the later operator restart',observed,collectionLimitation:'The first array-export helper saved an empty array; that failed capture is preserved. No new browser observation is claimed by this transcription.'},null,2));
