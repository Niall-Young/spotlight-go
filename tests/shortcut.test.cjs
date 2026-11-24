const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
require('../src/background/search-rank.js');

function setupWorker({ activeTab = { id: 10 }, sendFails = false, injectFails = false } = {}) {
  let onInstalled;
  let onCommand;
  const removedKeys = [];
  const sentMessages = [];
  const createdTabs = [];
  const event = { addListener() {} };
  const context = vm.createContext({
    self: { SpotlightRank },
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    importScripts() {},
    fetch: async () => ({ ok: true, json: async () => ['', []] }),
    chrome: {
      runtime: {
        getURL: (p) => `chrome-extension://test/${p}`,
        onInstalled: { addListener(fn) { onInstalled = fn; } },
        onMessage: event
      },
      commands: { onCommand: { addListener(fn) { onCommand = fn; } } },
      action: { onClicked: event },
      storage: {
        onChanged: event,
        local: {
          get: async () => ({}),
          set: async () => {},
          remove: async (key) => { removedKeys.push(key); }
        }
      },
      tabs: {
        query: async () => (activeTab ? [activeTab] : []),
        sendMessage: async (tabId, msg) => {
          if (sendFails) throw new Error('no receiver');
          sentMessages.push({ tabId, msg });
        },
        create: async (opts) => { createdTabs.push(opts); }
      },
      scripting: {
        executeScript: async () => {
          if (injectFails) throw new Error('cannot inject');
        }
      }
    }
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../src/background/service-worker.js'), 'utf8'),
    context
  );
  return { onInstalled, onCommand, removedKeys, sentMessages, createdTabs };
}

test('service-worker: chrome.commands show-search triggers overlay or falls back to new tab', async () => {
  const s = setupWorker({ activeTab: { id: 42 } });
  s.onCommand('show-search');
  await new Promise((r) => setImmediate(r));
  assert.equal(s.sentMessages.length, 1);
  assert.equal(s.sentMessages[0].tabId, 42);
  assert.equal(s.sentMessages[0].msg.type, 'show-overlay');
  assert.equal(s.createdTabs.length, 0);

  const restricted = setupWorker({ activeTab: { id: 99 }, sendFails: true, injectFails: true });
  restricted.onCommand('show-search');
  await new Promise((r) => setImmediate(r));
  assert.equal(restricted.sentMessages.length, 0);
  assert.equal(restricted.createdTabs.length, 1);
  assert.equal(Object.keys(restricted.createdTabs[0]).length, 0);
});

test('service-worker: update cleans up legacy customShortcut key', async () => {
  const s = setupWorker();
  await s.onInstalled({ reason: 'update' });
  assert.deepEqual(s.removedKeys, ['customShortcut']);
});

test('overlay: page keydown never triggers overlay directly; only show-overlay message opens it', async () => {
  const windowListeners = {};
  let onMessage;
  let appendedHost = null;
  const makeEl = (tag) => ({
    tagName: tag.toUpperCase(),
    style: {},
    dataset: {},
    className: '',
    children: [],
    setAttribute() {},
    addEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    attachShadow() {
      return {
        appendChild() {},
        querySelector() { return null; }
      };
    },
    focus() {},
    remove() {}
  });
  const context = vm.createContext({
    fetch: async () => ({ text: async () => '' }),
    navigator: { platform: 'MacIntel' },
    window: {
      SpotlightI18n: { init() {}, t: (k) => k },
      SpotlightResults: { create: () => ({ clear() {}, repaint() {} }) },
      addEventListener(type, fn) { windowListeners[type] = fn; }
    },
    document: {
      createElement: makeEl,
      documentElement: {
        appendChild(el) { appendedHost = el; return el; }
      },
      addEventListener() {},
      removeEventListener() {}
    },
    chrome: {
      runtime: {
        lastError: null,
        getURL: (p) => `chrome-extension://test/${p}`,
        onMessage: { addListener(fn) { onMessage = fn; } }
      },
      storage: {
        local: {
          get: (_keys, cb) => cb({ customShortcut: 'Alt+KeyK' })
        },
        onChanged: { addListener() {} }
      }
    }
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../src/overlay/overlay.js'), 'utf8'),
    context
  );
  // Wait for pre-fetched CSS promise to settle.
  await new Promise((r) => setImmediate(r));

  for (const combo of [
    { code: 'Space', altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
    { code: 'KeyK', altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
    { code: 'KeyK', altKey: false, ctrlKey: true, shiftKey: true, metaKey: false }
  ]) {
    let prevented = false;
    windowListeners.keydown({
      ...combo,
      isTrusted: true,
      preventDefault() { prevented = true; },
      stopImmediatePropagation() {}
    });
    assert.equal(prevented, false);
    assert.equal(appendedHost, null);
  }

  onMessage({ type: 'show-overlay' });
  await new Promise((r) => setImmediate(r));
  assert.ok(appendedHost);
  assert.equal(appendedHost.id, 'sg-overlay-host');
});

test('newtab: shortcut setting shows chrome.commands binding and opens chrome://extensions/shortcuts', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/newtab/newtab.js'), 'utf8');
  const start = source.indexOf('  const IS_MAC =');
  const end = source.indexOf('  // ---------- 搜索内容开关 ----------', start);
  assert.ok(start > 0 && end > start);

  let commands = [{ name: 'show-search', shortcut: '⌥Space' }];
  const createdTabs = [];
  const clickListeners = [];
  const docListeners = {};
  const winListeners = {};
  const classes = new Set();
  const settingsShortcut = {
    textContent: '',
    classList: {
      toggle(name, on) {
        if (on) classes.add(name);
        else classes.delete(name);
      }
    }
  };
  const settingsShortcutEdit = {
    addEventListener(type, fn) { if (type === 'click') clickListeners.push(fn); }
  };
  const settingsMask = { hidden: false };

  const context = vm.createContext({
    navigator: { platform: 'MacIntel' },
    i18n: { t: (key) => (key === 'settings.shortcut.unset' ? '未设置' : key) },
    settingsShortcut,
    settingsShortcutEdit,
    settingsMask,
    document: {
      hidden: false,
      addEventListener(type, fn) { docListeners[type] = fn; }
    },
    window: {
      addEventListener(type, fn) { winListeners[type] = fn; }
    },
    chrome: {
      runtime: { lastError: null },
      commands: { getAll(cb) { cb(commands); } },
      tabs: { create(opts) { createdTabs.push(opts); } }
    }
  });
  vm.runInContext(source.slice(start, end), context);

  context.refreshShortcutLabel();
  assert.equal(settingsShortcut.textContent, '⌥ Space');
  assert.equal(classes.has('nt-kbd-unset'), false);

  commands = [{ name: 'show-search', shortcut: '' }];
  context.refreshShortcutLabel();
  assert.equal(settingsShortcut.textContent, '未设置');
  assert.equal(classes.has('nt-kbd-unset'), true);

  commands = [{ name: 'show-search', shortcut: '⌘⇧K' }];
  docListeners.visibilitychange();
  assert.equal(settingsShortcut.textContent, '⌘⇧K');
  assert.equal(classes.has('nt-kbd-unset'), false);

  clickListeners[0]();
  assert.equal(createdTabs.length, 1);
  assert.equal(createdTabs[0].url, 'chrome://extensions/shortcuts');
});
