const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Only the DOM operations used by the production results panel are needed here.
class Element {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.className = '';
    this.classList = { add() {}, remove() {} };
  }
  set textContent(text) { this.text = text; this.children = []; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute() {}
  removeAttribute() {}
  addEventListener() {}
  scrollIntoView() {}
  querySelectorAll(selector) {
    return this.children.flatMap(child => [
      ...(child.className === selector.slice(1) ? [child] : []),
      ...child.querySelectorAll(selector)
    ]);
  }
}

function setup(container = new Element()) {
  const context = vm.createContext({
    URL,
    chrome: { runtime: { getURL: value => value } },
    document: {
      createElement: () => new Element(),
      createDocumentFragment: () => new Element(),
      createTextNode: () => new Element()
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/shared/results-panel.js'), 'utf8'), context);
  return context.SpotlightResults.create(container);
}

test('keyboard navigation reaches full scroll boundaries including trailing padding', () => {
  const container = new Element();
  container.scrollHeight = 900;
  container.scrollTop = 120;
  const panel = setup(container);
  panel.render({ suggestion: [
    { title: 'First', query: 'first' },
    { title: 'Last', query: 'last' }
  ] }, 'query');
  panel.moveSelection(-1);
  assert.equal(container.scrollTop, 0);
  panel.moveSelection(1);
  assert.equal(container.scrollTop, container.scrollHeight);
  // 手动滚开后，再按到边界依然能恢复到完整的底部。
  container.scrollTop = 100;
  panel.moveSelection(1);
  assert.equal(container.scrollTop, container.scrollHeight);
  panel.moveSelection(-1);
  assert.equal(container.scrollTop, 0);
});

test('keyboard navigation stops at either end and still moves across groups', () => {
  const panel = setup();
  panel.render({
    tab: [{ title: 'First', tabId: 1 }],
    bookmark: [{ title: 'Middle', url: 'https://middle.example' }],
    suggestion: [{ title: 'Last', query: 'last' }]
  }, 'query');
  panel.moveSelection(-1);
  panel.moveSelection(-1);
  assert.equal(panel.getSelected().tabId, 1);
  panel.moveSelection(1);
  assert.equal(panel.getSelected().group, 'bookmark');
  panel.moveSelection(1);
  assert.equal(panel.getSelected().group, 'suggestion');
  panel.moveSelection(1);
  panel.moveSelection(1);
  assert.equal(panel.getSelected().group, 'suggestion');
  panel.moveSelection(-1);
  assert.equal(panel.getSelected().group, 'bookmark');
  panel.moveSelection(-1);
  assert.equal(panel.getSelected().tabId, 1);
});

test('suggestion merges and language repaints preserve the selected local result', () => {
  const panel = setup();
  const groups = { tab: [
    { title: 'Alpha first', url: 'https://a.example', tabId: 1 },
    { title: 'Alpha second', url: 'https://b.example', tabId: 2 }
  ] };
  panel.render(groups, 'alpha');
  panel.moveSelection(1);
  assert.equal(panel.getSelected().tabId, 2);
  panel.mergeGroups({ suggestion: [{ title: 'alpha', query: 'alpha' }] }, 'alpha');
  assert.equal(panel.getSelected().tabId, 2);
  panel.repaint();
  assert.equal(panel.getSelected().tabId, 2);
  panel.render(groups, 'new query');
  assert.equal(panel.getSelected().tabId, 1);
});

test('URL action is selected ahead of matching tabs and survives suggestion updates', () => {
  const panel = setup();
  const query = 'https://example.org/path';
  panel.renderLocal({
    direct: [{ type: 'direct-search', title: query, query, url: query }],
    tab: [{ title: 'Existing page', tabId: 1, url: query + '/other' }]
  }, query);
  assert.equal(panel.getSelected().group, 'direct');
  panel.mergeGroups({ suggestion: [] }, query);
  assert.equal(panel.getSelected().url, query);
  panel.repaint();
  assert.equal(panel.getSelected().group, 'direct');
  panel.moveSelection(1);
  assert.equal(panel.getSelected().tabId, 1);
  panel.repaint();
  assert.equal(panel.getSelected().tabId, 1);
  panel.beginQuery('ordinary keyword');
  assert.equal(panel.getSelected(), null);
  panel.renderLocal({ direct: [], tab: [] }, 'ordinary keyword');
  assert.equal(panel.getSelected(), null);
});
