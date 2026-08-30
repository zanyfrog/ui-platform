import crypto from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { appPath, getApp } from './applications.js';
import { runtimeDir, uiBasePackagesDir, ormDir } from './paths.js';

async function readPackage(file: string): Promise<any> { return JSON.parse(await readFile(file, 'utf8')); }
async function copyClean(source: string, destination: string): Promise<void> {
  await cp(source, destination, {
    recursive: true,
    filter: (sourcePath) => !sourcePath.split(path.sep).some((part) => ['node_modules', 'dist', 'dist-server', '.git', '.vite'].includes(part)),
  });
}

function zipFolder(folder: string, zipFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let command: string; let args: string[]; let cwd = folder;
    if (process.platform === 'win32') {
      command = 'powershell.exe';
      const escapedFolder = folder.replaceAll("'", "''");
      const escapedZip = zipFile.replaceAll("'", "''");
      args = ['-NoProfile', '-NonInteractive', '-Command', `Compress-Archive -Path '${escapedFolder}\*' -DestinationPath '${escapedZip}' -Force`];
      cwd = path.dirname(folder);
    } else {
      command = 'zip';
      args = ['-rq', zipFile, '.'];
    }
    const child = spawn(command, args, { cwd, stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`ZIP command failed with exit code ${code}`)));
  });
}

export async function exportApp(key: string): Promise<{ zipFile: string; downloadName: string }> {
  const app = await getApp(key);
  if (!app.valid) throw new Error(`Cannot export invalid app: ${app.issues.join(', ')}`);
  const exportId = `${key}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const exportDir = path.join(runtimeDir, 'exports', exportId);
  const appDir = path.join(exportDir, 'app');
  const packagesDir = path.join(exportDir, 'packages');
  await mkdir(packagesDir, { recursive: true });
  await copyClean(appPath(key), appDir);

  // Copy the uploaded UI Base packages so the export is portable after npm install.
  const packageEntries = await readdir(uiBasePackagesDir, { withFileTypes: true });
  const versions = new Map<string, string>();
  for (const entry of packageEntries) {
    if (!entry.isDirectory()) continue;
    const source = path.join(uiBasePackagesDir, entry.name);
    const pkgFile = path.join(source, 'package.json');
    try {
      const pkg = await readPackage(pkgFile);
      if (!pkg.name) continue;
      versions.set(pkg.name, pkg.version ?? '0.0.0');
      await copyClean(source, path.join(packagesDir, entry.name));
    } catch {}
  }

  const appPackageFile = path.join(appDir, 'package.json');
  const appPackage = await readPackage(appPackageFile);
  for (const section of ['dependencies', 'devDependencies']) {
    for (const [name, value] of Object.entries(appPackage[section] ?? {})) {
      if (versions.has(name) && String(value).startsWith('file:')) appPackage[section][name] = versions.get(name);
    }
  }
  await writeFile(appPackageFile, JSON.stringify(appPackage, null, 2) + '\n', 'utf8');

  if ((appPackage.dependencies ?? {}).orm || (appPackage.devDependencies ?? {}).orm) {
    await copyClean(ormDir, path.join(packagesDir, 'orm'));
  }

  const rootPackage = {
    name: `${key}-portable-workspace`, private: true, version: '1.0.0',
    workspaces: ['app', 'packages/*'],
    scripts: {
      dev: `npm run dev -w ${appPackage.name}`,
      build: `npm run build -w ${appPackage.name}`,
      start: `npm run start -w ${appPackage.name}`,
      typecheck: `npm run typecheck -w ${appPackage.name}`,
      test: `npm run test -w ${appPackage.name}`,
    },
    engines: { node: '>=18' }, packageManager: 'npm@10.8.2',
  };
  await writeFile(path.join(exportDir, 'package.json'), JSON.stringify(rootPackage, null, 2) + '\n', 'utf8');
  await writeFile(path.join(exportDir, 'EXPORT-README.md'), `# ${app.name} - Portable Export\n\n1. Run \`npm install\`.\n2. Run \`npm run dev\` for development.\n3. Run \`npm run build\` then \`npm start\` for a production-style run.\n\nThe export includes the UI Base workspace packages required to satisfy the application's shared package dependencies.\n`, 'utf8');

  const zipFile = path.join(runtimeDir, 'exports', `${exportId}.zip`);
  await zipFolder(exportDir, zipFile);
  return { zipFile, downloadName: `${key}-export.zip` };
}
