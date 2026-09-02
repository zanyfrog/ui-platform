import crypto from 'node:crypto';
import { mkdir, readdir, readFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import type { BuilderTreeNode, PageDescriptor, PageSourcePayload, PageTreePayload } from '../shared/types.js';
import { appendHistory } from './history.js';
import { appPath } from './applications.js';
import { moveToOsTrash } from './trash.js';
import { atomicWriteText } from './json-files.js';

const pageExtension = /\.(ts|tsx)$/i;

function pageRoot(appKey: string): string {
  return path.join(appPath(appKey), 'src', 'pages');
}

function normalizeSource(source: string): string {
  const normalized = source.replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalized.startsWith('src/pages/') || normalized.split('/').some((part) => !part || part === '..' || part === '.')) {
    throw new Error('Page source must be a file inside src/pages.');
  }
  const relative = normalized.slice('src/pages/'.length);
  if (!pageExtension.test(relative) || relative.split('/').some((part) => part.startsWith('_'))) {
    throw new Error('Only non-underscored .ts and .tsx page files are supported.');
  }
  return normalized;
}

function fileFor(appKey: string, source: string): string {
  const normalized = normalizeSource(source);
  const file = path.resolve(appPath(appKey), normalized);
  const root = `${path.resolve(pageRoot(appKey))}${path.sep}`;
  if (!file.startsWith(root)) throw new Error('Page source resolved outside src/pages.');
  return file;
}

function routeFromSource(source: string): string {
  const relative = source.slice('src/pages/'.length).replace(pageExtension, '');
  const route = relative.replace(/\/index$/i, '').replace(/^index$/i, '').replaceAll('\\', '/');
  return `/${route}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function titleFromSource(source: string): string | undefined {
  const match = source.match(/export\s+(?:const|let)\s+title\s*=\s*['"`]([^'"`]+)['"`]/);
  return match?.[1]?.trim() || undefined;
}

function labelFromSegment(value: string): string {
  return value.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hashSource(source: string): string {
  return crypto.createHash('sha256').update(source).digest('hex');
}

async function sourceFiles(appKey: string): Promise<string[]> {
  const root = pageRoot(appKey);
  const found: string[] = [];
  async function walk(dir: string, relative = ''): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (entry.name.startsWith('_')) continue;
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), child);
      else if (entry.isFile() && pageExtension.test(entry.name)) found.push(`src/pages/${child}`);
    }
  }
  await walk(root);
  return found.sort((a, b) => a.localeCompare(b));
}

async function descriptor(appKey: string, source: string): Promise<PageDescriptor> {
  const text = await readFile(fileFor(appKey, source), 'utf8');
  const format = source.endsWith('.tsx') ? 'tsx' : 'typescript';
  const hasRender = /export\s+(?:async\s+)?function\s+render\s*\(/.test(text);
  const hasMarkup = /<[a-zA-Z][^>]*>/.test(text);
  const relative = source.slice('src/pages/'.length).split('/');
  const fileName = relative.pop()!;
  const defaultLabel = fileName.replace(pageExtension, '').toLowerCase() === 'index'
    ? (relative.at(-1) ? labelFromSegment(relative.at(-1)!) : 'Home')
    : labelFromSegment(fileName);
  return {
    id: `page:${source}`,
    source,
    route: routeFromSource(source),
    label: titleFromSource(text) ?? defaultLabel,
    title: titleFromSource(text),
    format,
    support: hasRender && hasMarkup ? 'partial' : hasRender ? 'supported' : 'code-managed',
    hash: hashSource(text),
  };
}

function structureFromMarkup(markup: string, page: PageDescriptor): BuilderTreeNode {
  const root: BuilderTreeNode = { id: `${page.id}:structure`, kind: 'element', label: page.label, children: [] };
  const stack: BuilderTreeNode[] = [root];
  const tokenPattern = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w.-]*)(?:\s[^<>]*?)?\s*\/?\s*>/g;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(markup))) {
    const token = match[0];
    const tag = match[1];
    if (!tag || token.startsWith('<!--')) continue;
    if (token.startsWith('</')) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const node: BuilderTreeNode = {
      id: `${page.id}:node:${tokenPattern.lastIndex}`,
      kind: tag.includes('-') ? 'component' : 'element',
      label: tag,
      children: [],
    };
    stack.at(-1)!.children!.push(node);
    if (!token.endsWith('/>') && !['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(tag.toLowerCase())) stack.push(node);
  }
  return root;
}

export async function getPageTree(appKey: string): Promise<PageTreePayload> {
  const pages = await Promise.all((await sourceFiles(appKey)).map((source) => descriptor(appKey, source)));
  const tree: BuilderTreeNode = { id: 'site', kind: 'site', label: 'Site', children: [] };
  const folders = new Map<string, BuilderTreeNode>([['', tree]]);
  for (const page of pages) {
    const relative = page.source.slice('src/pages/'.length).split('/');
    const fileName = relative.pop()!;
    let folder = '';
    for (const segment of relative) {
      const next = folder ? `${folder}/${segment}` : segment;
      let node = folders.get(next);
      if (!node) {
        node = { id: `folder:${next}`, kind: 'folder', label: labelFromSegment(segment), children: [] };
        folders.get(folder)!.children!.push(node);
        folders.set(next, node);
      }
      folder = next;
    }
    folders.get(folder)!.children!.push({ id: page.id, kind: 'page', label: page.label || labelFromSegment(fileName), route: page.route, source: page.source, format: page.format, support: page.support });
  }
  return { tree, pages };
}

function markupFromSource(source: string): string {
  return source.match(/return\s+`([\s\S]*?)`\s*;?/)?.[1] ?? source;
}

export async function getPageSource(appKey: string, source: string): Promise<PageSourcePayload> {
  const normalized = normalizeSource(source);
  const page = (await getPageTree(appKey)).pages.find((item) => item.source === normalized);
  if (!page) throw new Error('Page was not found.');
  const text = await readFile(fileFor(appKey, normalized), 'utf8');
  return { page: { ...page, hash: hashSource(text) }, source: text, structure: structureFromMarkup(markupFromSource(text), page) };
}

export async function savePageSource(appKey: string, source: string, text: string, expectedHash?: string): Promise<PageSourcePayload> {
  const normalized = normalizeSource(source);
  const file = fileFor(appKey, normalized);
  const current = await readFile(file, 'utf8');
  if (expectedHash && hashSource(current) !== expectedHash) throw new Error('Page changed on disk. Reload it before saving.');
  await atomicWriteText(file, text);
  await appendHistory(appPath(appKey), { action: 'page.updated', appKey, source: normalized, actor: 'local-user' });
  return getPageSource(appKey, normalized);
}

export async function deletePageSource(appKey: string, source: string): Promise<void> {
  const normalized = normalizeSource(source);
  const file = fileFor(appKey, normalized);
  await stat(file);
  await appendHistory(appPath(appKey), { action: 'page.deleted-to-os-trash', appKey, source: normalized, actor: 'local-user' });
  await moveToOsTrash(file);
}

export async function movePageSource(appKey: string, source: string, destination: string): Promise<PageTreePayload> {
  const from = fileFor(appKey, source);
  const to = fileFor(appKey, destination);
  if (from === to) return getPageTree(appKey);
  await stat(from);
  const destinationExists = await stat(to).then(() => true).catch(() => false);
  if (destinationExists) throw new Error('A page already exists at the destination.');
  await mkdir(path.dirname(to), { recursive: true });
  await rename(from, to);
  await appendHistory(appPath(appKey), { action: 'page.moved', appKey, source: normalizeSource(source), destination: normalizeSource(destination), actor: 'local-user' });
  return getPageTree(appKey);
}
