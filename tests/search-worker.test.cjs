const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
require('../src/background/search-rank.js');

function setup({ tabs = [], bookmarks = [], history = [], failBookmarks = false, fetcher } = {}) {
  let onMessage;
  const calls = [];
  const event = { addListener() {} };
  const context = vm.createContext({
    self: { SpotlightRank }, URL, AbortController,
    setTimeout: (fn, ms) => setTimeout(fn, fetcher ? Math.min(ms, 5) : ms), clearTimeout,
    importScripts() {}, fetch: fetcher || (async () => ({ json: async () => ['', []] })),
    chrome: {
      runtime: { onInstalled: event, onMessage: { addListener(fn) { onMessage = fn; } } },
      commands: { onCommand: event }, action: { onClicked: event },
      storage: { onChanged: event, local: { get: async () => ({}), set: async () => {} } },
      tabs: {
        query: async () => tabs,
        create: async (options) => calls.push(['create', options]),
        update: async (...args) => calls.push(['update', ...args])
      },
      windows: { update: async (...args) => calls.push(['window', ...args]) },
      search: { query: async (options) => calls.push(['search', options]) },
      bookmarks: { search: async () => { if (failBookmarks) throw Error('unavailable'); return bookmarks; } },
      history: { search: async () => history }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/background/service-worker.js'), 'utf8'), context);
  const send = (message) => new Promise(resolve => onMessage(message, {}, resolve));
  return { send, calls };
}

test('dedup retains the highest ranked tab and fills groups after cross-source dedup', async () => {
  const common = Array.from({ length: 5 }, (_, i) => ({ id: i, title: 'alpha', url: `https://example.org/${i}` }));
  const s = setup({
    tabs: [...common, { id: 99, title: 'alpha less exact', url: common[0].url }],
    bookmarks: [...common, ...Array.from({ length: 5 }, (_, i) => ({ title: 'alpha', url: `https://bookmarks.org/${i}` }))]
  });
  const { groups } = await s.send({ type: 'search', query: 'alpha' });
  assert.equal(groups.tab.length, 5);
  assert.equal(groups.tab.find(item => item.url === common[0].url).tabId, 0);
  assert.equal(groups.bookmark.length, 5);
  assert.ok(groups.bookmark.every(item => item.url.includes('bookmarks.org')));
});

test('a failed source preserves results from the remaining sources and web search', async () => {
  const s = setup({ failBookmarks: true, tabs: [{ id: 1, title: 'alpha', url: 'https://example.org' }] });
  const { groups } = await s.send({ type: 'search', query: 'alpha' });
  assert.equal(groups.tab.length, 1);
  assert.equal(groups.bookmark.length, 0);
  const result = await s.send({ type: 'search-suggestions', query: 'alpha' });
  assert.equal(result.groups.suggestion[0].query, 'alpha');
});

test('original URL input navigates consistently before and after suggestions arrive', async () => {
  for (const disposition of ['NEW_TAB', 'CURRENT_TAB']) {
    const s = setup();
    const { groups } = await s.send({ type: 'search', query: 'example.org/path' });
    await s.send({ type: 'search-suggestions', query: 'example.org/path' });
    for (const item of [{ type: 'direct-search', query: 'example.org/path' }, groups.direct[0]]) {
      await s.send({ type: 'open', item, disposition });
      const last = s.calls.at(-1);
      assert.equal(last[0], disposition === 'CURRENT_TAB' ? 'update' : 'create');
      assert.equal(last[1].url, 'https://example.org/path');
    }
  }
});

test('pasted URLs have a local direct action without requesting network suggestions', async () => {
  for (const [query, expected] of [
    [' https://example.org/path?q=hello%20world#part ', 'https://example.org/path?q=hello%20world#part'],
    ['http://example.org:8080/path', 'http://example.org:8080/path'],
    ['example.org/path', 'https://example.org/path'],
    ['localhost:3000/path', 'https://localhost:3000/path'],
    ['https://例子.测试/页面', new URL('https://例子.测试/页面').href]
  ]) {
    let networkRequests = 0;
    const s = setup({ fetcher: async () => { networkRequests++; throw Error('unexpected fetch'); } });
    const { groups } = await s.send({ type: 'search', query });
    assert.equal(groups.direct.length, 1);
    assert.equal(groups.direct[0].url, expected);
    const suggestions = await s.send({ type: 'search-suggestions', query });
    assert.equal(suggestions.groups.suggestion.length, 0);
    assert.equal(networkRequests, 0);
    await s.send({ type: 'open', item: groups.direct[0] });
    assert.equal(s.calls.at(-1)[0], 'create');
    assert.equal(s.calls.at(-1)[1].url, expected);
  }
});

test('ordinary keywords and non-web schemes do not get a direct URL action', async () => {
  const s = setup();
  for (const query of ['e 签宝', 'hello world', 'javascript:alert(1)', 'file:///tmp/example', 'https://']) {
    const { groups } = await s.send({ type: 'search', query });
    assert.equal(groups.direct.length, 0, query);
    await s.send({ type: 'open', item: { type: 'direct-search', query } });
    assert.equal(s.calls.at(-1)[0], 'search', query);
  }
});

test('ordinary text and explicit web suggestions search; existing tabs switch windows', async () => {
  const s = setup();
  await s.send({ type: 'open', item: { type: 'direct-search', query: 'e 签宝' } });
  assert.equal(s.calls.at(-1)[0], 'search');
  assert.equal(s.calls.at(-1)[1].text, 'e 签宝');
  await s.send({ type: 'open', item: { group: 'suggestion', query: 'example.org' } });
  assert.equal(s.calls.at(-1)[0], 'search');
  await s.send({ type: 'open', item: { group: 'tab', tabId: 5, windowId: 8 } });
  assert.equal(s.calls.at(-2)[1], 5);
  assert.equal(s.calls.at(-1)[1], 8);
});

test('Google timeout falls back to Bing with a fresh signal', async () => {
  let attempts = 0;
  const s = setup({ fetcher: async (url, { signal }) => {
    attempts++;
    if (attempts === 1) return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(Error('timeout')));
    });
    assert.ok(url.includes('bing.com'));
    assert.equal(signal.aborted, false);
    return { ok: true, json: async () => ['alpha', ['alpha beta']] };
  } });
  const { groups } = await s.send({ type: 'search-suggestions', query: 'alpha' });
  assert.equal(attempts, 2);
  assert.equal(groups.suggestion[1].query, 'alpha beta');
});

test('network errors and malformed suggestions keep the original query available', async () => {
  for (const response of [{ ok: false }, { ok: true, json: async () => ({ error: true }) }]) {
    let attempts = 0;
    const s = setup({ fetcher: async () => { attempts++; return response; } });
    const { groups } = await s.send({ type: 'search-suggestions', query: 'alpha' });
    assert.equal(attempts, 2);
    assert.equal(groups.suggestion.length, 1);
    assert.equal(groups.suggestion[0].query, 'alpha');
  }
});
