import fs from 'node:fs/promises';
import { discoverComponents } from '../../src/server/component-registry.ts';
const root='C:/Projects/Modular/ui-platform/node_modules/@ui-base/ui';
const result={nativePackageRoot:root,symbolicLink:(await fs.lstat(root)).isSymbolicLink(),realPath:await fs.realpath(root)};
try{await discoverComponents('codex-test-v1-local-pilot-20261102');result.discovery='succeeded';}
catch(error){result.discovery='failed';result.name=error.name;result.message=error.message;result.stack=error.stack?.split('\n').slice(0,7);}
await fs.writeFile(new URL('./native-diagnosis.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
