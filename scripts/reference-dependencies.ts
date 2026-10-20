import path from 'node:path';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnNpm } from '../src/server/npm-process.js';

export async function missingReferenceDependencies(root: string): Promise<string[]> {
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const names = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
  // Inspect the app's own install, including broken links, without using CommonJS
  // resolution: several platform packages expose only ESM import conditions.
  const installed = await Promise.all(names.map(name =>
    stat(path.join(root, 'node_modules', name, 'package.json')).then(file => file.isFile()).catch(() => false)));
  return names.filter((_, index) => !installed[index]);
}

export async function repairReferenceServiceBuild(root: string): Promise<boolean> {
  const services = path.join(root, 'packages/app-services');
  const manifest = JSON.parse(await readFile(path.join(services, 'package.json'), 'utf8'));
  if (manifest.scripts?.build !== 'node build.mjs') return false;
  const template = fileURLToPath(new URL('../templates/standard/files/packages/app-services/', import.meta.url));
  let repaired = false;
  for (const relative of ['build.mjs', 'src/index.js']) {
    const destination = path.join(services, relative);
    if (await stat(destination).catch(() => null)) continue;
    // The Standard build copies this JavaScript verbatim. Recover existing
    // service registrations from its output before falling back to the template.
    const output = path.join(services, 'dist/index.js');
    const source = relative === 'src/index.js' && await stat(output).catch(() => null)
      ? output : path.join(template, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination, constants.COPYFILE_EXCL);
    console.log(`Restored missing reference Application file: packages/app-services/${relative}`);
    repaired = true;
  }
  return repaired;
}

export async function ensureReferenceDependencies(root: string): Promise<void> {
  const repaired = await repairReferenceServiceBuild(root);
  const missing = await missingReferenceDependencies(root);
  if (missing.length) console.log(`Installing missing reference Application dependencies: ${missing.join(', ')}`);
  const needsBuild = repaired || missing.length > 0 || !await stat(path.join(root, 'packages/app-services/dist/index.js')).catch(() => null);
  for (const args of [...(missing.length ? [['install']] : []), ...(needsBuild ? [['run', 'build:services']] : [])]) {
    await new Promise<void>((resolve, reject) => {
      const child = spawnNpm(args, { cwd: root, stdio: 'inherit', windowsHide: true });
      child.once('error', reject);
      child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Reference npm ${args.join(' ')} failed (${code}). Application files were preserved.`)));
    });
  }
  const unresolved = await missingReferenceDependencies(root);
  if (unresolved.length) throw new Error(`Reference dependencies remain unavailable: ${unresolved.join(', ')}`);
}
