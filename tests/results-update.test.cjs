const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

class Element {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.listeners = {};
    this.attributes = {};
    this.classes = new Set();
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      contains: name => this.classes.has(name)
    };
  }
  set textContent(value) { this.text = value; this.children = []; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(key, value) { this.attributes[key] = value; }
  removeAttribute(key) { delete this.attributes[key]; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
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
  const container = new Element();
  const opened = [];
  const panel = context.SpotlightResults.create(container, { onSelect: item => opened.push(item) });
  panel.render({
    bookmark: [{ title: 'Mixkit', url: 'https://mixkit.co' }],
    suggestion: [{ title: 'ki', query: 'ki' }, { title: 'kings', query: 'kings' }]
  }, 'ki');
  return { panel, container, opened };
}

test('query updates retain visible rows and highlight without letting old results activate', () => {
  const { panel, container, opened } = setup();
  const previous = container.children.slice();
  const rowsBefore = container.querySelectorAll('.sg-item');
  assert.equal(rowsBefore[0].classList.contains('sg-selected'), true);
  panel.beginQuery('kit');
  assert.deepEqual(container.children, previous);
  assert.equal(rowsBefore[0].classList.contains('sg-selected'), true);
  assert.equal(panel.getSelected(), null);
  panel.moveSelection(1);
  for (const row of container.querySelectorAll('.sg-item')) {
    row.listeners.mousemove();
    row.listeners.click();
  }
  assert.equal(rowsBefore[0].classList.contains('sg-selected'), true);
  assert.equal(panel.getSelected(), null);
  assert.equal(opened.length, 0);
});

test('local replies keep the suggestion section until fresh suggestions replace it', () => {
  const { panel, container, opened } = setup();
  panel.beginQuery('kit');
  panel.renderLocal({ bookmark: [{ title: 'Kit', url: 'https://kit.example' }] }, 'kit');
  assert.equal(container.children.length, 2);
  assert.equal(panel.getSelected().url, 'https://kit.example');
  const oldSuggestions = container.querySelectorAll('.sg-item').slice(1);
  for (const row of oldSuggestions) {
    assert.equal(row.attributes['aria-disabled'], 'true');
    row.listeners.mousemove();
    row.listeners.click();
  }
  assert.equal(opened.length, 0);
  panel.moveSelection(1);
  assert.equal(panel.getSelected().url, 'https://kit.example');
  panel.mergeGroups({ suggestion: [{ title: 'kitten', query: 'kitten' }] }, 'kit');
  assert.equal(container.attributes['aria-busy'], undefined);
  panel.moveSelection(1);
  assert.equal(panel.getSelected().query, 'kitten');
  container.querySelectorAll('.sg-item')[1].listeners.click();
  assert.equal(opened[0].query, 'kitten');
});

test('an empty local reply retains inert suggestions with visual highlight and clearing removes everything', () => {
  const { panel, container, opened } = setup();
  panel.beginQuery('xyz');
  panel.renderLocal({}, 'xyz');
  assert.equal(container.children.length, 1);
  const rows = container.querySelectorAll('.sg-item');
  assert.equal(rows[0].classList.contains('sg-selected'), true);
  assert.equal(rows[0].attributes['aria-selected'], undefined);
  assert.equal(panel.getSelected(), null);
  rows[0].listeners.click();
  assert.equal(opened.length, 0);
  panel.clear();
  assert.equal(container.children.length, 0);
  assert.equal(container.attributes['aria-busy'], undefined);
  assert.equal(panel.hasItems(), false);
});
