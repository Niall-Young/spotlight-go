const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const surface of ['newtab', 'overlay']) {
  function setup() {
    const source = fs.readFileSync(path.join(__dirname, `../src/${surface}/${surface}.js`), 'utf8');
    const listeners = {};
    const requests = [];
    let selected = null;
    const input = { value: 'e', addEventListener: (type, fn) => { listeners[type] = fn; } };
    const panel = {
      clear() { selected = null; },
      render(groups) { selected = groups?.tab?.[0] || null; },
      mergeGroups(groups) { selected ||= groups?.suggestion?.[0] || null; }
    };
    const context = vm.createContext({
      input, panel, searchSeq: 0, composing: false,
      chrome: { runtime: { sendMessage(message, callback) { requests.push({ message, callback }); } } }
    });
    // Execute the production search handlers with delayed message replies and input events.
    const start = source.indexOf('  function sendSearch(query)');
    const end = source.indexOf(surface === 'newtab'
      ? "  input.addEventListener('keydown'" : '  function openDirectSearch', start);
    vm.runInContext(source.slice(start, end), context);
    if (surface === 'overlay') {
      const inputStart = source.indexOf('  function onInput()');
      vm.runInContext(source.slice(inputStart, source.indexOf('  async function openOverlay', inputStart)), context);
    }
    const composition = source.match(/input\.addEventListener\('compositionstart',[\s\S]*?input\.addEventListener\('compositionend',[\s\S]*?\n\s*}\);/)[0];
    vm.runInContext(composition, context);
    if (surface === 'newtab') {
      const keyStart = source.indexOf("  input.addEventListener('keydown'");
      vm.runInContext(source.slice(keyStart, source.indexOf("  input.addEventListener('compositionstart'", keyStart)), context);
    } else {
      const keyStart = source.indexOf('  function handleKeydown');
      vm.runInContext(source.slice(keyStart, source.indexOf('  function onInput', keyStart)), context);
      listeners.keydown = context.handleKeydown;
    }
    return { input, requests, listeners, context, selected: () => selected };
  }

  test(`${surface}: changing e to e 签宝 immediately removes old selectable results`, () => {
    const s = setup();
    vm.runInContext("sendSearch('e')", s.context);
    s.requests[0].callback({ groups: { tab: [{ title: 'Home / X' }] } });
    assert.equal(s.selected().title, 'Home / X');
    s.input.value = 'e 签宝';
    vm.runInContext('onInput()', s.context);
    assert.equal(s.selected(), null);
    // Suggestions for the previous query arrive after the input changes.
    s.requests[1].callback({ groups: { suggestion: [{ title: 'e old suggestion' }] } });
    assert.equal(s.selected(), null);
    s.requests[2].callback({ groups: {} });
    assert.equal(s.selected(), null);
  });

  test(`${surface}: IME commit searches the final text without requiring another input event`, () => {
    const s = setup();
    vm.runInContext("sendSearch('e')", s.context);
    s.listeners.compositionstart();
    s.requests[0].callback({ groups: { tab: [{ title: 'Extensions' }] } });
    assert.equal(s.selected(), null);
    s.input.value = 'e 签宝';
    s.listeners.compositionend();
    assert.equal(s.requests.at(-1).message.query, 'e 签宝');
    assert.equal(s.selected(), null);
  });

  test(`${surface}: replies cannot render for text that no longer equals the input`, () => {
    const s = setup();
    vm.runInContext("sendSearch('e')", s.context);
    s.input.value = 'e 签宝';
    s.requests[0].callback({ groups: { tab: [{ title: 'Extensions' }] } });
    assert.equal(s.selected(), null);
  });

  test(`${surface}: IME Enter and Escape never trigger extension actions`, () => {
    const s = setup();
    for (const event of [
      { key: 'Enter', isComposing: true },
      { key: 'Enter', keyCode: 229 },
      { key: 'Escape', isComposing: true }
    ]) s.listeners.keydown({ ...event, preventDefault() { assert.fail('IME key intercepted'); } });
    assert.equal(s.requests.length, 0);
    assert.equal(s.input.value, 'e');
  });
}
