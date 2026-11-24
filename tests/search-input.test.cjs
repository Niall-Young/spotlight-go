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
    const opened = [];
    let closed = 0;
    let selected = null;
    const input = { value: 'e', addEventListener: (type, fn) => { listeners[type] = fn; } };
    const panel = {
      beginQuery() { selected = null; },
      renderLocal(groups) { this.render(groups); },
      clear() { selected = null; },
      hasItems() { return selected !== null; },
      getSelected() { return selected; },
      render(groups) { selected = groups?.tab?.[0] || null; },
      mergeGroups(groups) { selected ||= groups?.suggestion?.[0] || null; }
    };
    const context = vm.createContext({
      input, panel, searchSeq: 0, lastSearchedQuery: '', localSearchPending: false,
      pendingSubmitSeq: 0, composing: false,
      openItem(item) { opened.push({ type: 'item', item }); },
      doDirectSearch(query) { opened.push({ type: 'direct', query }); },
      selectItem(item) { opened.push({ type: 'item', item }); closed++; },
      openDirectSearch(query) { opened.push({ type: 'direct', query }); },
      closeOverlay() { closed++; },
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
    return { input, requests, opened, listeners, context, selected: () => selected, closed: () => closed };
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

  test(`${surface}: Enter while local search is pending waits and opens the top local result`, () => {
    const s = setup();
    s.input.value = 'github';
    vm.runInContext('onInput()', s.context);
    s.listeners.keydown({ key: 'Enter', preventDefault() {} });
    assert.equal(s.opened.length, 0);
    s.requests[0].callback({ groups: { tab: [{ group: 'tab', title: 'GitHub', tabId: 7 }] } });
    assert.equal(s.opened.length, 1);
    assert.equal(s.opened[0].type, 'item');
    assert.equal(s.opened[0].item.tabId, 7);
    // 已提交打开，不再额外请求网络建议
    assert.equal(s.requests.length, 1);
  });

  test(`${surface}: Enter while local search is pending falls back to direct search when no local match`, () => {
    const s = setup();
    s.input.value = 'unknown query';
    vm.runInContext('onInput()', s.context);
    s.listeners.keydown({ key: 'Enter', preventDefault() {} });
    assert.equal(s.opened.length, 0);
    s.requests[0].callback({ groups: { tab: [], bookmark: [], history: [] } });
    assert.equal(s.opened.length, 1);
    assert.equal(s.opened[0].type, 'direct');
    assert.equal(s.opened[0].query, 'unknown query');
  });

  test(`${surface}: typing after a pending Enter cancels the queued submit`, () => {
    const s = setup();
    s.input.value = 'git';
    vm.runInContext('onInput()', s.context);
    s.listeners.keydown({ key: 'Enter', preventDefault() {} });
    s.input.value = 'github';
    vm.runInContext('onInput()', s.context);
    s.requests[0].callback({ groups: { tab: [{ group: 'tab', title: 'Git', tabId: 1 }] } });
    assert.equal(s.opened.length, 0);
    s.requests[1].callback({ groups: { tab: [{ group: 'tab', title: 'GitHub', tabId: 2 }] } });
    assert.equal(s.opened.length, 0);
    assert.equal(s.selected().tabId, 2);
  });

  test(`${surface}: trailing space or duplicate input after IME does not reset ready results`, () => {
    const s = setup();
    s.input.value = 'github';
    vm.runInContext('onInput()', s.context);
    s.requests[0].callback({ groups: { tab: [{ group: 'tab', title: 'GitHub', tabId: 3 }] } });
    assert.equal(s.selected().tabId, 3);
    s.input.value = 'github ';
    vm.runInContext('onInput()', s.context);
    assert.equal(s.requests.length, 2); // 仅 local + suggestions，未重发 local search
    assert.equal(s.selected().tabId, 3);
    s.listeners.keydown({ key: 'Enter', preventDefault() {} });
    assert.equal(s.opened.length, 1);
    assert.equal(s.opened[0].type, 'item');
    assert.equal(s.opened[0].item.tabId, 3);
  });
}
