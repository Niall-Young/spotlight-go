const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../src/newtab/shortcut-import.js');
const { parse, merge, normalize } = globalThis.SpotlightShortcutImport;
const read = (navConfig) => parse(JSON.stringify({ navConfig }), 'backup.itabdata');

test('iTab groups and nested folders preserve order and skip components', () => {
  const parsed = read([{ children: [
    { name: '中文 <&>', url: 'https://example.com' },
    { type: 'folder', children: [{ name: '', url: 'https://nested.example/a?q=1#x' }] },
    { component: 'weather', url: 'https://widget.example' },
    { name: 'bad', url: 'javascript:alert(1)' }
  ] }]);
  assert.deepEqual(parsed, { entries: [
    { title: '中文 <&>', url: 'https://example.com/' },
    { title: 'nested.example', url: 'https://nested.example/a?q=1#x' }
  ], invalid: 1 });
});
test('merge preserves existing data and canonicalizes duplicates', () => {
  const existing = [{ title: 'Keep me', url: 'https://EXAMPLE.com:443', extra: true }];
  const parsed = read([{ children: [
    { name: 'Replace?', url: 'https://example.com/' },
    { name: 'First', url: 'https://new.example' },
    { name: 'Second', url: 'https://new.example/' }
  ] }]);
  const result = merge(existing, parsed);
  assert.equal(result.duplicates, 2);
  assert.equal(result.additions.length, 1);
  assert.deepEqual(result.shortcuts[0], existing[0]);
  assert.equal(result.shortcuts[1].title, 'First');
  assert.equal(existing.length, 1);
  assert.equal(merge(result.shortcuts, parsed).additions.length, 0);
});
test('URL paths, parameters and fragments remain distinct', () => {
  const entries = ['/a', '/A', '/a?q=1', '/a?q=2', '/a#x'].map(s => ({ url: 'https://example.com' + s }));
  assert.equal(merge([], read(entries)).additions.length, 5);
});
test('rejects damaged and unrelated JSON without harvesting settings URLs', () => {
  assert.throws(() => parse('{', 'test.itabdata'), /import.malformed/);
  for (const data of [null, [], { settings: { url: 'https://example.com' } }, { navConfig: {} }]) {
    assert.throws(() => parse(JSON.stringify(data), 'test.json'), /import.unsupported/);
  }
});
test('supports BOM and empty navigation', () => {
  assert.deepEqual(parse('\uFEFF{"navConfig":[]}', 'test.itabdata'), { entries: [], invalid: 0 });
});
test('only accepts absolute HTTP and HTTPS links', () => {
  for (const url of ['', 'example.com', '/relative', 'file:///a', 'data:text/html,a', 'chrome://settings', null]) assert.equal(normalize(url), null);
  assert.equal(normalize(' HTTP://EXAMPLE.COM:80 '), 'http://example.com/');
});
test('iterative folder traversal handles deeply nested backups', () => {
  let node = { url: 'https://example.com' };
  for (let i = 0; i < 500; i++) node = { type: 'folder', children: [node] };
  assert.equal(read([node]).entries.length, 1);
});
