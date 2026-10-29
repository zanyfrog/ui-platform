import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { V1_FIXTURE_APPLICATION_ID, V1_FIXTURE_APPLICATION_KEY } from './v1-development-policy.js';

/** A dedicated disposable development fixture. Existing app content is never silently overwritten. */
export async function ensureV1DevelopmentApplication(appsDir: string): Promise<void> {
  const destination = path.join(appsDir, V1_FIXTURE_APPLICATION_KEY);
  const existing = await stat(destination).then(() => true, () => false);
  if (existing) {
    try {
      const marker = JSON.parse(await readFile(path.join(destination, '.v1-development-fixture.json'), 'utf8')) as { applicationId?: string };
      const manifest = JSON.parse(await readFile(path.join(destination, 'app.manifest.json'), 'utf8')) as { appId?: string };
      if (marker.applicationId !== V1_FIXTURE_APPLICATION_ID || manifest.appId !== V1_FIXTURE_APPLICATION_ID)
        throw new Error('V1_FIXTURE_APPLICATION_CONFLICT');
      for (const relative of ['app.settings.json', 'app-services.json', 'package.json', 'tsconfig.json',
        'src/main.ts', 'src/pages/Home.ts'])
        await stat(path.join(destination, relative));
      return;
    } catch (error) {
      throw new Error('V1_FIXTURE_APPLICATION_CONFLICT', { cause: error });
    }
  }
  await mkdir(appsDir, { recursive: true });
  const temporary = path.join(appsDir, `.creating-${V1_FIXTURE_APPLICATION_KEY}-${randomUUID()}`);
  try {
    await mkdir(path.join(temporary, 'src', 'pages'), { recursive: true });
    await writeFile(path.join(temporary, 'app.manifest.json'), JSON.stringify({ manifestVersion: '1.0.0',
      appId: V1_FIXTURE_APPLICATION_ID, template: 'v1-development-fixture', templateVersion: '1.0.0',
      packages: {}, foundationImports: {} }, null, 2));
    await writeFile(path.join(temporary, '.v1-development-fixture.json'), JSON.stringify({ applicationId: V1_FIXTURE_APPLICATION_ID }));
    await writeFile(path.join(temporary, 'app.settings.json'), JSON.stringify({ application: { name: 'V1 Development Identity Fixture',
      status: 'active' } }, null, 2));
    await writeFile(path.join(temporary, 'app-services.json'), '{}');
    await writeFile(path.join(temporary, 'package.json'), JSON.stringify({ name: V1_FIXTURE_APPLICATION_KEY, private: true, type: 'module' }));
    await writeFile(path.join(temporary, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext' } }));
    await writeFile(path.join(temporary, 'src', 'main.ts'), 'export {};\n');
    await writeFile(path.join(temporary, 'src', 'pages', 'Home.ts'), 'export const title = "V1 Development Fixture";\n');
    for (const [bundle, type, filename] of [['form', 'form', 'form.json'], ['workflow', 'workflow', 'workflow.json']] as const) {
      await mkdir(path.join(temporary, bundle));
      await writeFile(path.join(temporary, bundle, 'artifact.json'), JSON.stringify({ schemaVersion: 1, definitionVersion: 1,
        artifactId: `v1-${type}`, artifactType: type, name: `V1 ${type}`, files: { definition: filename } }, null, 2));
      await writeFile(path.join(temporary, bundle, filename), '{}');
    }
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}
