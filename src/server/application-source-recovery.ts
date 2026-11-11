import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { ArtifactConflictError } from '@ui-platform/artifacts';
import { capture, checksum, declaredPaths, discoverBundles, recoverBoundRoleBundle, storageKey, type RoleBundleLocation } from '@ui-platform/artifacts/storage';
import { parseDefinitionJson } from '@ui-platform/versioned-definition-registry';
import { appPath, readApplicationOwnerId } from './applications.js';
import { withApplicationMutation } from './composition-lock.js';
import { appendHistory } from './history.js';

type RecoveryType = 'visual' | 'presentation' | 'artifact';
type Target = { type: RecoveryType; location: RoleBundleLocation; kind?: 'page' | 'shell' };
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const absent = (error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; };
const parse = (text: string | null) => parseDefinitionJson(text ?? 'null') as Record<string, unknown> | null;

async function physical(file: string, directory = false) {
  const info = await lstat(file);
  if ((directory ? !info.isDirectory() : !info.isFile() || info.nlink !== 1) || await realpath(file) !== file) {
    throw new Error('RECOVERY_TARGET_NOT_PHYSICAL');
  }
}

async function journalFor(target: Target) {
  const { root, directory, anchor } = target.location;
  const transaction = path.join(root, '.uib', 'transactions', storageKey(target.type === 'artifact' ? directory : path.join(directory, anchor)));
  for (const folder of [root, directory, path.join(root, '.uib'), path.dirname(transaction), transaction]) await physical(folder, true);
  const journal = path.join(transaction, 'pending.json');
  await physical(journal);
  return readFile(journal);
}

async function targets(key: string, owner: string) {
  const root = appPath(key);
  await physical(root, true);
  const presentation = path.join(root, 'presentation');
  const candidates: Target[] = [{ type: 'presentation', location: {
    root: presentation, directory: presentation, anchor: 'presentation.manifest.json',
    paths: ['presentation.manifest.json', 'draft/presentation.json'],
  } }];
  for (const [collection, kind] of [['src/pages', 'page'], ['shells', 'shell']] as const) {
    const visual = path.join(root, collection), transactions = path.join(visual, '.uib/transactions');
    const present = await physical(transactions, true).then(() => true).catch(error => { absent(error); return false; });
    if (!present) continue;
    for (const entry of await readdir(transactions)) {
      if (!/^[a-f0-9]{64}$/.test(entry)) continue;
      const journal = path.join(transactions, entry, 'pending.json');
      const bytes = await physical(journal).then(() => readFile(journal)).catch(absent);
      if (!bytes) continue;
      const value = parse(bytes.toString('utf8'));
      const anchorPath = value?.identity;
      if (typeof anchorPath !== 'string' || storageKey(anchorPath) !== entry || value?.bundle !== path.dirname(anchorPath)) continue;
      const relative = path.relative(visual, anchorPath);
      if (!/^(?:[\w-]+[\\/])*[\w-]+\.visual\.json$/.test(relative)) continue;
      const anchor = path.basename(anchorPath), stem = anchor.slice(0, -'.visual.json'.length);
      candidates.push({ type: 'visual', kind, location: {
        root: visual, directory: path.dirname(anchorPath), anchor,
        paths: ['.visual.json', '.html', '.css', '.fixtures.json', '.functions.ts'].map(extension => stem + extension),
      } });
    }
  }
  for (const directory of await discoverBundles(root)) {
    const anchor = 'artifact.json';
    const manifest = await readFile(path.join(directory, anchor), 'utf8');
    candidates.push({ type: 'artifact', location: { root, directory, anchor, paths: [anchor, ...new Set(declaredPaths(manifest))] } });
  }
  const result = [];
  for (const target of candidates) {
    const journal = await journalFor(target).catch(absent);
    if (!journal) continue;
    const { directory, anchor, paths } = target.location;
    const revision = checksum(await capture(directory, [...paths], { includeManifest: false }));
    result.push({ target, receipt: {
      type: target.type, targetId: digest(JSON.stringify([owner, target.type, directory, anchor])),
      sourceRevision: revision, journalSha256: digest(journal),
    } });
  }
  return result;
}

export async function listApplicationRecovery(key: string, admit: () => Promise<void>) {
  await admit();
  const owner = await readApplicationOwnerId(key);
  const found = await targets(key, owner);
  await admit();
  if (await readApplicationOwnerId(key) !== owner) throw new Error('V1_ORIGINAL_OWNER_CHANGED');
  return found.map(item => item.receipt);
}

export async function recoverApplicationSource(key: string, request: {
  type: RecoveryType; targetId: string; sourceRevision: string; journalSha256: string;
}, actor: string, admit: () => Promise<void>) {
  if (!request || !['visual', 'presentation', 'artifact'].includes(request.type) ||
      ![request.targetId, request.sourceRevision, request.journalSha256].every(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value))) {
    throw Object.assign(new Error('Invalid recovery approval.'), { status: 422 });
  }
  await admit();
  const owner = await readApplicationOwnerId(key);
  const root = appPath(key);
  return withApplicationMutation(root, async () => {
    let started = false;
    let restoredRevision: string | undefined;
    const authority = async () => {
      await admit();
      if (await readApplicationOwnerId(key) !== owner) throw new Error('V1_ORIGINAL_OWNER_CHANGED');
    };
    const audit = (outcome: string) => appendHistory(root, {
      action: 'source.recovery', outcome, appId: owner, actor, type: request.type, targetId: request.targetId,
      sourceRevision: request.sourceRevision, journalSha256: request.journalSha256,
    });
    try {
      await authority();
      const selected = (await targets(key, owner)).find(item => item.receipt.targetId === request.targetId && item.target.type === request.type);
      if (!selected) throw Object.assign(new Error('Recovery target unavailable.'), { status: 409 });
      if (selected.receipt.sourceRevision !== request.sourceRevision || selected.receipt.journalSha256 !== request.journalSha256) {
        throw new ArtifactConflictError();
      }
      const { location, kind } = selected.target;
      const revision = await recoverBoundRoleBundle(location, {
        ...request, generic: request.type === 'artifact', admit: authority,
        mutationStarted() { started = true; },
        verified: async () => audit('source-verified'),
        validate(original, current) {
          const prior = parse(original[location.anchor]), present = parse(current[location.anchor]);
          const immutable = request.type === 'presentation' ? ['applicationId', 'type', 'schemaVersion'] :
            request.type === 'artifact' ? ['artifactId', 'artifactType', 'schemaVersion'] : ['artifactId', 'kind', 'routeId', 'schemaVersion'];
          const id = prior?.[immutable[0]];
          if (typeof id !== 'string' || !id || (!present && current[location.anchor] !== null) ||
              (present && immutable.some(field => prior?.[field] !== present[field])) ||
              (kind && prior?.kind !== kind) || (request.type === 'presentation' && id !== owner) ||
              (request.type === 'artifact' && JSON.stringify([...new Set(declaredPaths(original[location.anchor]))].sort()) !==
                JSON.stringify(location.paths.filter(file => file !== location.anchor).sort()))) throw new Error('RECOVERY_SOURCE_IDENTITY_MISMATCH');
        },
      });
      restoredRevision = revision;
      await audit('succeeded');
      return { outcome: 'succeeded', sourceRevision: revision };
    } catch (cause) {
      if (started) {
        await audit('partial-failure').catch(() => {});
        if (restoredRevision) {
          throw Object.assign(new Error('SOURCE_RECOVERY_AUDIT_INCOMPLETE', { cause }), { restoredRevision });
        }
        throw new Error('SOURCE_RECOVERY_PARTIAL_FAILURE', { cause });
      }
      if (await readApplicationOwnerId(key) === owner) {
        await audit('refused');
      }
      return { outcome: 'refused', cause };
    }
  }, { recovery: 'refuse' }).then(result => {
    if (result.outcome === 'refused') throw result.cause;
    return result;
  });
}
