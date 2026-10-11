const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { StudioStorage, atomicWrite, MAX_BYTES } = require('../storage.cjs');
let parseState;
test('atomic persistence, previous backup, and v1 import use the real schema', async () => {
  ({ parseState } = await import('../renderer/core.mjs'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'focus-store-test-'));
  try {
    const store = new StudioStorage(dir, parseState);
    assert.equal(store.load().raw, null);
    store.save('{"version":1,"owner":"First"}');
    assert.equal(parseState(store.load().raw).version, 2);
    store.save('{"version":2,"owner":"Second"}');
    assert.equal(parseState(fs.readFileSync(store.backup, 'utf8')).owner, 'First');
    assert.equal(parseState(store.load().raw).owner, 'Second');
    assert.deepEqual(fs.readdirSync(dir).sort(), ['studio.json', 'studio.previous.json']);
    assert.equal(fs.statSync(store.file).mode & 0o777, 0o600);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
test('invalid imports preserve current data; explicit recovery retains unreadable original', async () => {
  ({ parseState } = await import('../renderer/core.mjs'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'focus-recovery-test-'));
  try {
    const store = new StudioStorage(dir, parseState);
    store.save('{"version":2,"owner":"Keep"}');
    assert.throws(() => store.save('{"version":99}', { replace: true }));
    assert.equal(parseState(store.load().raw).owner, 'Keep');
    fs.writeFileSync(store.file, 'unreadable original');
    assert(store.load().error); assert.throws(() => store.save('{"version":2}'));
    assert.equal(fs.readFileSync(store.file, 'utf8'), 'unreadable original');
    store.save('{"version":2,"owner":"Recovered"}', { replace: true });
    assert.equal(parseState(store.load().raw).owner, 'Recovered');
    const retained = fs.readdirSync(dir).find(name => name.startsWith('studio.unreadable-'));
    assert.equal(fs.readFileSync(path.join(dir, retained), 'utf8'), 'unreadable original');
  } finally { fs.rmSync(dir, { recursive: true }); }
});
test('size limits and failed destinations leave no temporary files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'focus-atomic-test-'));
  try {
    assert.throws(() => atomicWrite(path.join(dir, 'large.json'), 'x'.repeat(MAX_BYTES + 1)));
    fs.mkdirSync(path.join(dir, 'not-a-file'));
    assert.throws(() => atomicWrite(path.join(dir, 'not-a-file'), 'test'));
    assert.deepEqual(fs.readdirSync(dir), ['not-a-file']);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
