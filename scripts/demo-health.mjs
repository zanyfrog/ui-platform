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

export async function checkReferenceHealth() {
  const issues = await checkDemoHealth('http://127.0.0.1:5192', undefined, 'http://127.0.0.1:4092');
  for (const route of ['/', '/admin']) {
    try {
      const response = await fetch('http://127.0.0.1:5193' + route, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) issues.push(`Reference ${route}: HTTP ${response.status}`);
      await response.body?.cancel();
    } catch (error) { issues.push(`Reference ${route}: ${error.cause?.message ?? error.message}`); }
  }
  return issues;
}
