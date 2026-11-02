import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const evidence = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const before = JSON.parse(fs.readFileSync(path.join(evidence, 'demo-stopped-before.json'), 'utf8').replace(/^\uFEFF/, ''));
const preserved = before.map(entry => {
  try { const hash = createHash('sha256').update(fs.readFileSync(entry.path)).digest('hex'); return { path: entry.path, unchanged: hash.toUpperCase() === entry.sha256, sha256: hash }; }
  catch { return { path: entry.path, unreadable: true }; }
});
const db = new DatabaseSync('C:/Projects/Modular/builder-demo/runtime/iam-v1-development.sqlite', { readOnly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'security_%' ORDER BY name").all().map(({ name }) => {
  const rows = db.prepare(`SELECT * FROM "${name}"`).all();
  return { name, rows: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
});
db.close();
fs.writeFileSync(path.join(evidence, 'preservation.json'), JSON.stringify({ preserved, tables }, null, 2));
const files = [];
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (entry.name !== 'files.json') files.push({ path: full, bytes: fs.statSync(full).size, sha256: createHash('sha256').update(fs.readFileSync(full)).digest('hex') }); } }
walk(evidence);
fs.writeFileSync(path.join(evidence, 'files.json'), JSON.stringify(files, null, 2));
console.log(JSON.stringify({ preservedFiles: preserved.length, mismatches: preserved.filter(x => x.unchanged === false).map(x => x.path), unreadable: preserved.filter(x => x.unreadable).map(x => x.path), tables: tables.map(t => ({ name: t.name, rows: t.rows })), evidenceFiles: files.length }));
