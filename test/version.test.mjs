// The version reported by /healthz (src/version.js) matches package.json, CITATION.cff and the compose image tag.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {ROOT} from './helpers.mjs';
import {VERSION} from '../src/version.js';import worker from '../src/worker.js';
const rd=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
test('src/version.js matches package.json, package-lock, CITATION.cff and docker-compose',()=>{const v=JSON.parse(rd('package.json')).version;assert.equal(VERSION,v);
  assert.equal(JSON.parse(rd('package-lock.json')).version,v);assert.match(rd('CITATION.cff'),new RegExp(`^version: "${v}"`,'m'));assert.match(rd('docker-compose.yml'),new RegExp(`image: jane:${v}\\b`));});
test('the Worker answers /healthz with the version, without touching storage',async()=>{const r=await worker.fetch(new Request('https://jane.test/healthz'),{});
  assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,version:VERSION});});
