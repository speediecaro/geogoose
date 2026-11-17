import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const context = { window: {}, URL, ArrayBuffer };
vm.runInNewContext(await readFile(new URL('../../regional-map.js', import.meta.url), 'utf8'), context);
const create = context.window.geoGooseRegionalMap.createProtocol;
const controller = new AbortController();
test('regional tile replaces base only when present and receives cancellation signal', async () => {
  let baseCalls = 0;
  const data = new ArrayBuffer(8);
  const protocol = create({ getZxy: async () => { baseCalls++; } }, {
    getZxy: async (z, x, y, signal) => {
      assert.deepEqual([z, x, y], [15, 9500, 11500]);
      assert.equal(signal, controller.signal);
      return { data };
    }
  });
  assert.equal((await protocol({ url: 'geogoose://15/9500/11500' }, controller)).data, data);
  assert.equal(baseCalls, 0);
});
test('missing regional tile retains worldwide coverage; low zoom skips regional archive', async () => {
  let regionalCalls = 0;
  const protocol = create({ getZxy: async () => ({ data: new ArrayBuffer(4) }) },
    { getZxy: async () => { regionalCalls++; return undefined; } });
  assert.equal((await protocol({ url: 'geogoose://15/9500/11500' }, controller)).data.byteLength, 4);
  assert.equal((await protocol({ url: 'geogoose://5/10/12' }, controller)).data.byteLength, 4);
  assert.equal(regionalCalls, 1);
});
test('regional errors propagate rather than silently pretending to show Quebec data', async () => {
  let baseCalls = 0;
  const protocol = create({ getZxy: async () => { baseCalls++; } },
    { getZxy: async () => { throw new Error('Regional archive unavailable'); } });
  await assert.rejects(protocol({ url: 'geogoose://15/9500/11500' }, controller), /unavailable/);
  assert.equal(baseCalls, 0);
  await assert.rejects(protocol({ url: 'geogoose://16/1/1' }, controller), /coordinates/);
  await assert.rejects(protocol({ url: 'https://example.invalid' }, controller), /URL/);
});
