// Read-only checks for local development service readiness, not authorization.
export async function checkDemoHealth(builder, preview, apiOrigin) {
  const issues = [];
  const read = async (label, url) => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) { issues.push(`${label}: HTTP ${response.status}`); return ''; }
      return await response.text();
    } catch (error) { issues.push(`${label}: ${error.cause?.message ?? error.message}`); return ''; }
  };
  await read('Builder page', builder);
  const api = new URL('/api/health', apiOrigin ?? builder); if (!apiOrigin) api.port = '5280';
  const health = await read('Management API', api);
  if (health && !/"ok"\s*:\s*true/.test(health)) issues.push('Management API: invalid health response');
  const main = await read('Builder JavaScript', new URL('/src/client/main.ts', builder));
  const dependencies = [...new Set([...main.matchAll(/(?:from\s*|import\s*)["'](\/[^"']+)/g)].map(match => match[1]).filter(source => source.includes('/deps/')))];
  await Promise.all(dependencies.map(source => read('Builder dependency ' + source.split('/').pop(), new URL(source, builder))));
  if (preview) {
    await read('Public Application', new URL('/demo/', preview));
    await read('Admin Application', new URL('/demo/admin', preview));
  }
  return issues;
}

export async function checkReferenceHealth(manager = 'http://127.0.0.1:5192', application = 'http://127.0.0.1:5193', api = 'http://127.0.0.1:4092') {
  const issues = await checkDemoHealth(manager, undefined, api);
  for (const route of ['/', '/admin']) {
    try {
      const response = await fetch(new URL(route, application), { signal: AbortSignal.timeout(5000) });
      if (!response.ok) issues.push(`Reference ${route}: HTTP ${response.status}`);
      await response.body?.cancel();
    } catch (error) { issues.push(`Reference ${route}: ${error.cause?.message ?? error.message}`); }
  }
  // HTML is only a Vite shell. Transform the entry and its generated composition
  // modules as well, so locked source cannot be reported as a ready Application.
  const pending = ['/src/main.ts'];
  const visited = new Set();
  while (pending.length) {
    const source = pending.shift();
    if (visited.has(source)) continue;
    visited.add(source);
    try {
      const response = await fetch(new URL(source, application), { signal: AbortSignal.timeout(5000) });
      const body = await response.text();
      if (!response.ok) { issues.push(`Reference module ${source}: HTTP ${response.status}`); continue; }
      for (const match of body.matchAll(/(?:from\s*|import\s*)["'](\/[^"']+)["']/g)) {
        if (match[1].startsWith('/@id/')) pending.push(match[1]);
      }
    } catch (error) { issues.push(`Reference module ${source}: ${error.cause?.message ?? error.message}`); }
  }
  return issues;
}
