import crypto from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { appPath, getApp } from './applications.js';
import { runtimeDir, ormDir } from './paths.js';

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

  // Vendor external file dependencies; app-local file dependencies already travel with the app.
  const sourceAppPackage = await readPackage(path.join(appPath(key), 'package.json'));
  const versions = new Map<string, string>();
  await vendorExternalFileDependencies(appPath(key), sourceAppPackage, packagesDir, versions);

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
  await writeFile(path.join(exportDir, 'EXPORT-README.md'), `# ${app.name} - Portable Export\n\n1. Run \`npm install\`.\n2. Run \`npm run dev\` for development.\n3. Run \`npm run build\` then \`npm start\` for a production-style run.\n\nThe export includes external file-based packages declared by the application, including selected foundation workspace dependencies.\n`, 'utf8');

  const zipFile = path.join(runtimeDir, 'exports', `${exportId}.zip`);
  await zipFolder(exportDir, zipFile);
  return { zipFile, downloadName: `${key}-export.zip` };
}

async function vendorExternalFileDependencies(
  sourceAppDir: string,
  appPackage: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> },
  packagesDir: string,
  versions: Map<string, string>,
): Promise<void> {
  for (const section of ['dependencies', 'devDependencies'] as const) {
    for (const [name, value] of Object.entries(appPackage[section] ?? {})) {
      if (!value.startsWith('file:')) continue;
      const source = path.resolve(sourceAppDir, value.slice('file:'.length));
      if (source === sourceAppDir || source.startsWith(sourceAppDir + path.sep)) continue;
      try {
        const pkg = await readPackage(path.join(source, 'package.json')) as { name?: string; version?: string };
        if (!pkg.name || versions.has(pkg.name)) continue;
        versions.set(pkg.name, pkg.version ?? '0.0.0');
        await copyClean(source, path.join(packagesDir, packageFolderName(pkg.name)));
      } catch {
        // Leave unresolved external file dependencies intact for a visible npm install failure.
      }
    }
  }
}

function packageFolderName(packageName: string): string {
  return packageName.replace(/^@/, '').replaceAll('/', '__');
}
