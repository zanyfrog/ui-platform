import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { missingReferenceDependencies, repairReferenceServiceBuild } from '../scripts/reference-dependencies.js';

it('restores a service package absent from an older cached Application', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'reference-legacy-'));
  try {
    expect(await repairReferenceServiceBuild(root)).toBe(true);
    const services = path.join(root, 'packages/app-services');
    expect(JSON.parse(await readFile(path.join(services, 'package.json'), 'utf8')).scripts.build).toBe('node build.mjs');
    expect(await readFile(path.join(services, 'src/index.js'), 'utf8')).toContain('export {}');
    expect(await repairReferenceServiceBuild(root)).toBe(false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('recovers missing service build files, preserves registrations, and leaves existing source intact', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'reference-build-'));
  const services = path.join(root, 'packages/app-services');
  try {
    await mkdir(path.join(services, 'dist'), { recursive: true });
    await writeFile(path.join(services, 'package.json'), JSON.stringify({ scripts: { build: 'node build.mjs' } }));
    await writeFile(path.join(services, 'dist/index.js'), 'export const custom = 42;');
    expect(await repairReferenceServiceBuild(root)).toBe(true);
    expect(await readFile(path.join(services, 'src/index.js'), 'utf8')).toBe('export const custom = 42;');
    expect(await readFile(path.join(services, 'build.mjs'), 'utf8')).toContain("copyFile('src/index.js', 'dist/index.js')");
    await writeFile(path.join(services, 'src/index.js'), 'export const edited = true;');
    expect(await repairReferenceServiceBuild(root)).toBe(false);
    expect(await readFile(path.join(services, 'src/index.js'), 'utf8')).toBe('export const edited = true;');
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('detects incomplete reference installations even when the Application folder exists', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'reference-dependencies-'));
  try {
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies: { 'reference-test-package': 'file:packages/example' } }));
    expect(await missingReferenceDependencies(root)).toEqual(['reference-test-package']);
    const installed = path.join(root, 'node_modules/reference-test-package');
    await mkdir(installed, { recursive: true });
    await writeFile(path.join(installed, 'package.json'), JSON.stringify({ main: 'index.js' }));
    await writeFile(path.join(installed, 'index.js'), 'module.exports = {};');
    expect(await missingReferenceDependencies(root)).toEqual([]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
