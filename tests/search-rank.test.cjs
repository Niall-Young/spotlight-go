const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
require('../src/background/search-rank.js');
const Rank = globalThis.SpotlightRank;

test('partial multi-word matches are rejected in titles and domains', () => {
  assert.equal(Rank.scoreTextMatch('AI tools', 'https://tools.example', 'ai totallynewtopic'), 0);
  assert.equal(Rank.scoreTextMatch('设计资源', 'https://design.example', '设计 新产品'), 0);
  assert.equal(Rank.scoreTextMatch('邮件', 'https://mail.example.com', 'example unknown'), 0);
  assert.equal(Rank.scoreTextMatch('AI tools', 'https://tools.example', 'totallynewtopic ai'), 0);
});

test('all terms may match across the title, domain and path', () => {
  assert.ok(Rank.scoreTextMatch('AI tools', 'https://design.example/docs', ' ai  DESIGN docs ') > 0);
  assert.ok(Rank.scoreTextMatch('设计资源 新产品', 'https://design.example', '设计 新产品') > 0);
});

test('single-term matching and exact-match priority are preserved', () => {
  const exact = Rank.scoreTextMatch('Design', 'https://example.test', 'design');
  const prefix = Rank.scoreTextMatch('Design tools', 'https://example.test', 'design');
  assert.ok(exact > prefix && prefix > 0);
  assert.ok(Rank.scoreTextMatch('设计资源', 'https://example.test', '资源') > 0);
  assert.equal(Rank.scoreTextMatch('Design', 'https://example.test', 'unrelated'), 0);
  assert.equal(Rank.scoreTextMatch('Design', 'https://example.test', '  '), 0);
});

test('worker returns empty local groups despite high visits and selection boosts', async () => {
  const query = 'ai totallynewtopic';
  const url = 'https://tools.example/';
  const entry = {
    id: 1, windowId: 1, title: 'AI tools', url,
    visitCount: 10000, typedCount: 1000, lastVisitTime: Date.now()
  };
  let onMessage;
  const event = { addListener() {} };
  const context = vm.createContext({
    self: { SpotlightRank: Rank }, URL, AbortController, setTimeout, clearTimeout,
    importScripts() {},
    fetch: async () => ({ json: async () => [query, []] }),
    chrome: {
      runtime: { onInstalled: event, onMessage: { addListener(fn) { onMessage = fn; } } },
      commands: { onCommand: event }, action: { onClicked: event },
      storage: {
        onChanged: event,
        local: { get: async () => ({ selectionStats: {
          [query]: { [Rank.normalizeUrlKey(url)]: { count: 999, lastSelectedAt: Date.now() } }
        } }) }
      },
      tabs: { query: async () => [entry] },
      bookmarks: { search: async () => [entry] },
      history: { search: async () => [entry] }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/background/service-worker.js'), 'utf8'), context);
  const send = (type) => new Promise(resolve => onMessage({ type, query }, {}, resolve));
  const result = await send('search');
  for (const group of ['tab', 'bookmark', 'history']) assert.equal(result.groups[group].length, 0);
  const suggestions = await send('search-suggestions');
  assert.equal(suggestions.groups.suggestion[0].query, query);
});
