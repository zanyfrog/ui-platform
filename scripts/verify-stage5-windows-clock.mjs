import fs from 'node:fs/promises';
const args = process.argv.slice(2), attempt = args.find(a => /^--attempt=[a-z0-9-]+$/.test(a))?.slice(10);
const integration = args.includes('--integration');
if (!attempt || args.length !== (integration ? 2 : 1)) throw Error('Unique --attempt required');
const destination = 'evidence/v1-stage5-windows-clock-correction-20261106/' + attempt;
if (await fs.stat(destination).then(() => true, () => false)) throw Error('IMMUTABLE_ATTEMPT_EXISTS');
process.argv = [...process.argv.slice(0, 2), '--security-only'];
let source = (await fs.readFile('scripts/verify-stage5-integration.mjs', 'utf8')).replaceAll('evidence/v1-stage5-wp3-integration-20261105', destination);
if (!integration) {
source = source.replace("const tests = ['stage5-integration'];", "const tests = ['stage5-windows-clock-reliability','stage5-security','stage5-rpc-boundary','stage5-refusal-rpc'];");
source = source.replace('!transformed.includes("\'stage5-integration\'")', '!transformed.includes("\'stage5-windows-clock-reliability\'")');
if (!source.includes("const tests = ['stage5-windows-clock-reliability'")) throw Error('RUNNER_ADAPTATION_FAILED');
}
await import('data:text/javascript,' + encodeURIComponent(source));
