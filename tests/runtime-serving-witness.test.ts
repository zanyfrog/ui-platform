import { execFileSync } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import { readFile, mkdtemp, rm, realpath } from 'node:fs/promises';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { digest } from '../src/server/production/boundary.js';
import { readRuntimeWitness } from './fixtures/runtime-serving-witness.js';

it('requires pinned HTTPS peer and complete matching served bytes', async () => {
  const target = process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT, original = process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT;
  if (!target || !original || await realpath(target) !== await realpath(process.cwd()) || await realpath(target) === await realpath(original)) {
    throw Error('PHYSICAL_ISOLATION_REQUIRED');
  }
  const root = await mkdtemp(path.join(tmpdir(), 'runtime-witness-'));
  try {
    execFileSync('C:/Program Files/Git/usr/bin/openssl.exe', ['req','-x509','-newkey','rsa:2048','-nodes','-keyout','key.pem',
      '-out','cert.pem','-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1'], {cwd:root,windowsHide:true,stdio:'ignore'});
    const ca=await readFile(path.join(root,'cert.pem'),'utf8'),key=await readFile(path.join(root,'key.pem'),'utf8');
    const expected=Buffer.from('immutable bundle');
    let served=expected;
    const server=createServer({cert:ca,key},(_req,res)=>{
      res.writeHead(200,{'x-ui-release':'release','x-ui-manifest-fingerprint':'manifest'}).end(served);
    });
    try{
      await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
      const port=(server.address() as AddressInfo).port;
      const input={endpoint:'https://127.0.0.1:'+port,ca,pin:new X509Certificate(ca).fingerprint256,
        signal:AbortSignal.timeout(10_000),releaseId:'release',manifest:'manifest',bundleHash:digest(expected),bundleLength:expected.length};
      await expect(readRuntimeWitness(input)).resolves.toEqual({releaseId:'release',manifest:'manifest'});
      await expect(readRuntimeWitness({...input,pin:'wrong'})).rejects.toThrow('RUNTIME_PEER_MISMATCH');
      await expect(readRuntimeWitness({...input,endpoint:'https://localhost:'+port})).rejects.toMatchObject({code:'ERR_TLS_CERT_ALTNAME_INVALID'});
      await expect(readRuntimeWitness({...input,releaseId:'wrong'})).rejects.toThrow('RUNTIME_RELEASE_OBSERVATION_MISMATCH');
      await expect(readRuntimeWitness({...input,manifest:'wrong'})).rejects.toThrow('RUNTIME_RELEASE_OBSERVATION_MISMATCH');
      served=Buffer.alloc(expected.length);
      await expect(readRuntimeWitness(input)).rejects.toThrow('RUNTIME_RELEASE_OBSERVATION_MISMATCH');
      served=expected.subarray(0,5);
      await expect(readRuntimeWitness(input)).rejects.toThrow('RUNTIME_RELEASE_OBSERVATION_MISMATCH');
    }finally{
      await new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();});
    }
  }finally{
    await rm(root,{recursive:true,force:true});
  }
});
