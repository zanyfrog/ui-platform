import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

// Reuse accepted Stage 3 preparation and journeys, redirecting all generated
// evidence and package copies away from the accepted Stage 3 evidence.
const evidence = 'evidence/v1-stage4-20261105/asset-regression';
await fs.mkdir(evidence, { recursive: true });
const preparation = (await fs.readFile('scripts/prepare-stage3-physical.mjs', 'utf8'))
  .replaceAll('evidence/v1-stage3-physical-20261105', evidence + '/physical')
  .replace("filter:p=>!p.includes('node_modules')", "filter:p=>!p.includes('node_modules') && !(name === 'components' && p.split(path.sep).includes('.uib'))");
process.env.UI_PLATFORM_STAGE3_PREPARATION_ROOT = path.resolve(evidence, 'physical/platform');
await import('data:text/javascript,' + encodeURIComponent(preparation));
await fs.writeFile(path.join(evidence, 'physical/.gitignore'), '/platform/\n/ui-base/\n');
const generated = [];
try {
  for (const name of ['stage3-protected-upload', 'stage3-retained-presentation']) {
    const original = await fs.readFile(`tests/${name}.test.ts`, 'utf8');
    const input = original.replaceAll('evidence/v1-stage3-20261104', evidence + '/browser')
      .replaceAll('evidence/v1-stage3-physical-20261105', evidence + '/physical');
    const file = `tests/stage4-${randomUUID()}.test.ts`; await fs.writeFile(file, input); generated.push(file);
    await fs.mkdir(evidence + '/browser', { recursive: true });
    await fs.writeFile(path.join(evidence, name + '-input.json'), JSON.stringify({ source: `tests/${name}.test.ts`, sourceSha256: createHash('sha256').update(original).digest('hex'), executedSha256: createHash('sha256').update(input).digest('hex'), changes: 'Evidence output paths only' }, null, 2));
  }
  const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...generated, '--no-file-parallelism', '--reporter=default', '--reporter=json', `--outputFile=${evidence}/results.json`], {
    windowsHide: true, stdio: 'inherit', env: { ...process.env, UI_PLATFORM_STAGE3_PHYSICAL_ROOT: path.resolve(evidence, 'physical/platform'), UI_PLATFORM_TEST_EVIDENCE_ROOT: path.resolve(evidence, 'diagnostics') },
  });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  if (code !== 0) process.exitCode = 1;
} finally { for (const file of generated) await fs.unlink(file); }
