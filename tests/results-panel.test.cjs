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

function setup() {
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
  return context.SpotlightResults.create(new Element());
}

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
