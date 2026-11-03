import base64, hashlib, json, pathlib, tarfile
root = pathlib.Path('C:/Projects/Modular/ui-platform')
evidence = root / 'evidence/v1-shared-native-installation-20261103'
baseline = json.loads((root / 'evidence/v1-native-physical-assessment-20261102/installation-inventory.json').read_text(encoding='utf-8'))
pack = json.loads((evidence / 'pack.json').read_text(encoding='utf-8-sig'))[0]
archive = root / 'vendor/native/ui-base-ui-0.5.1.tgz'
assert archive.resolve() == archive.absolute() and not archive.is_symlink()
data = archive.read_bytes()
integrity = 'sha512-' + base64.b64encode(hashlib.sha512(data).digest()).decode()
assert integrity == pack['integrity'] == baseline['packDryRun']['integrity']
assert hashlib.sha1(data).hexdigest() == pack['shasum'] == baseline['packDryRun']['shasum']
expected = {f['path']: f for f in baseline['packDryRun']['files']}
actual = []
with tarfile.open(archive, 'r:gz') as tar:
    for member in tar.getmembers():
        assert not member.issym() and not member.islnk()
        if member.isdir(): continue
        assert member.isfile() and member.name.startswith('package/')
        relative = member.name[len('package/'):]
        assert relative in expected and '..' not in pathlib.PurePosixPath(relative).parts
        payload = tar.extractfile(member).read()
        digest = hashlib.sha256(payload).hexdigest()
        assert digest == expected[relative]['sha256'] and len(payload) == expected[relative]['bytes']
        actual.append({'path': relative, 'bytes': len(payload), 'sha256': digest})
assert len(actual) == len(expected) == 54 and len({f['path'] for f in actual}) == 54
for f in expected.values():
    source = pathlib.Path('C:/Projects/Modular/ui-base/packages/ui-base-ui') / f['path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == f['sha256']
result = {'name': pack['name'], 'version': pack['version'], 'archive': str(archive), 'sha256': hashlib.sha256(data).hexdigest(),
          'integrity': integrity, 'payloadMatches': True, 'sourceUnchanged': True, 'files': actual}
assert result['name'] == '@ui-base/ui' and result['version'] == '0.5.1'
(evidence / 'archive-verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k != 'files'}))
