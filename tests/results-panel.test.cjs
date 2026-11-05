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

test('suggestion merges and language repaints preserve the selected local result', () => {
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
  const panel = context.SpotlightResults.create(new Element());
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
