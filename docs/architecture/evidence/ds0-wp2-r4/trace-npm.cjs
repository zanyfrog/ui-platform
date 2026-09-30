const fs = require('node:fs');
const path = require('node:path');
if ((process.argv[1] || '').replaceAll('\\','/').endsWith('/npm-cli.js')) {
  const cli = path.resolve(process.argv[1]);
  const version = JSON.parse(fs.readFileSync(path.resolve(path.dirname(cli),'../package.json'),'utf8')).version;
  fs.appendFileSync(path.join(__dirname,'npm-invocations.jsonl'), JSON.stringify({ cli, version, args: process.argv.slice(2), at: new Date().toISOString() })+'\n');
  if (version !== '10.8.2') throw Error('Unexpected npm version: '+version);
}
