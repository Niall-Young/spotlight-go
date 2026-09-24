(function () {
  'use strict';

  let host = null;
  let shadow = null;
  let input = null;
  let panel = null;
  let searchSeq = 0;
  let composing = false;
  let cssPromise = null;
  let pendingKeys = null;
  let trigger = null;

  function loadCss() {
    if (!cssPromise) {
      cssPromise = Promise.all([
        fetch(chrome.runtime.getURL('src/shared/results-panel.css')).then((r) => r.text()),
        fetch(chrome.runtime.getURL('src/overlay/overlay.css')).then((r) => r.text())
      ])
        .then((parts) => parts.join('\n'))
        .catch((err) => {
          cssPromise = null;
          throw err;
        });
    }
    return cssPromise;
  }

  // 页面加载后即预取 CSS，避免首次唤起时等待 fetch
  loadCss().catch(() => {});

  // 从收到唤起消息到 input 聚焦之间，缓冲用户已经敲下的字符，
  // 否则按键会落到宿主页面（首字母丢失的根因之一）
  function startKeyBuffer() {
    if (pendingKeys !== null) return;
    pendingKeys = '';
    window.addEventListener('keydown', bufferKeydown, true);
  }

  function stopKeyBuffer() {
    if (pendingKeys === null) return;
    pendingKeys = null;
    window.removeEventListener('keydown', bufferKeydown, true);
  }

  function bufferKeydown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Backspace') {
      pendingKeys = pendingKeys.slice(0, -1);
    } else if (event.key.length === 1) {
      pendingKeys += event.key;
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function flushKeyBuffer() {
    if (pendingKeys === null) return;
    const text = pendingKeys;
    stopKeyBuffer();
    if (text && input) {
      input.value = text;
      onInput();
    }
  }

  // 等待 show-overlay 消息存在空窗（service worker 冷启动可达秒级），
  // 空窗内敲下的字符会落进宿主页面当前聚焦的输入框。故在页面内识别到
  // 快捷键 keydown 时同步打开浮层，不等消息；快捷键绑定向后台查询
  // （chrome.commands.getAll），用户改绑后依然生效，查询失败回退默认绑定。
  function defaultTrigger() {
    const mac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    return mac
      ? { alt: true, ctrl: false, shift: false, meta: false, code: 'Space' }
      : { alt: false, ctrl: true, shift: true, meta: false, code: 'KeyK' };
  }

  function keyNameToCode(name) {
    if (/^[A-Z]$/.test(name)) return `Key${name}`;
    if (/^[0-9]$/.test(name)) return `Digit${name}`;
    return name;
  }

  function parseShortcut(shortcut) {
    if (!shortcut) return null;
    const parts = shortcut.split('+');
    const parsed = {
      alt: false,
      ctrl: false,
      shift: false,
      meta: false,
      code: keyNameToCode(parts.pop())
    };
    for (const part of parts) {
      if (part === 'Alt') parsed.alt = true;
      else if (part === 'Ctrl' || part === 'MacCtrl') parsed.ctrl = true;
      else if (part === 'Shift') parsed.shift = true;
      else if (part === 'Command') parsed.meta = true;
      else return null;
    }
    return parsed;
  }

  function loadTrigger() {
    try {
      chrome.runtime.sendMessage({ type: 'get-commands' }, (response) => {
        if (chrome.runtime.lastError) return;
        const entry = (response || []).find((c) => c.name === 'show-search');
        const parsed = parseShortcut(entry?.shortcut);
        if (parsed) trigger = parsed;
      });
    } catch (_) {
      // 扩展上下文失效（如扩展刚重载），保留默认绑定
    }
  }

  function matchesTrigger(event) {
    const t = trigger || (trigger = defaultTrigger());
    return (
      event.code === t.code &&
      event.altKey === t.alt &&
      event.ctrlKey === t.ctrl &&
      event.shiftKey === t.shift &&
      event.metaKey === t.meta
    );
  }

  function watchTrigger(event) {
    if (host || pendingKeys !== null) return;
    if (!matchesTrigger(event)) return;
    openOverlay();
  }

  function restoreBufferedText(text) {
    if (!text) return;
    const el = document.activeElement;
    if (
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
      typeof el.selectionStart === 'number'
    ) {
      el.setRangeText(text, el.selectionStart, el.selectionEnd, 'end');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (el && el.isContentEditable) {
      document.execCommand('insertText', false, text);
    }
  }

  window.addEventListener('keydown', watchTrigger, true);
  loadTrigger();

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'show-overlay') {
      if (host) {
        input?.focus();
        // 仅在输入框未聚焦时全选，避免用户正在输入时被迟到的消息打断
        if (shadow && shadow.activeElement !== input) input?.select();
      } else {
        startKeyBuffer();
        openOverlay();
      }
    }
  });

  function sendSearch(query) {
    const seq = ++searchSeq;
    // 本地结果先行渲染；网络建议由后台预取，随后合并到列表尾部
    chrome.runtime.sendMessage({ type: 'search', query }, (response) => {
      if (chrome.runtime.lastError) return;
      if (seq !== searchSeq || !panel) return;
      panel.render(response?.groups, query);
      updateFooter(query);
      chrome.runtime.sendMessage({ type: 'search-suggestions', query }, (res) => {
        if (chrome.runtime.lastError) return;
        if (seq !== searchSeq || !panel) return;
        panel.mergeGroups({ suggestion: res?.groups?.suggestion || [] }, query);
        updateFooter(query);
      });
    });
  }

  function updateFooter(query) {
    if (!shadow) return;
    const footer = shadow.querySelector('.sg-overlay-footer-text');
    if (!footer) return;
    footer.textContent = query
      ? panel.hasItems()
        ? 'Tab 选择 · Enter 打开'
        : `Enter 搜索 “${query}”`
      : '输入以搜索标签页、书签、历史与网页';
  }

  function openDirectSearch(query) {
    chrome.runtime.sendMessage({
      type: 'open',
      item: { type: 'direct-search', query }
    });
  }

  function selectItem(item) {
    chrome.runtime.sendMessage({
      type: 'open',
      item,
      query: input ? input.value.trim() : ''
    });
    closeOverlay();
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeOverlay();
      return;
    }
    if (composing) return;
    if (event.key === 'Tab') {
      // Tab 向下选择、Shift+Tab 向上选择，焦点始终锁在浮层内
      event.preventDefault();
      panel.moveSelection(event.shiftKey ? -1 : 1);
      updateFooter(input.value.trim());
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = panel.getSelected();
      if (selected) {
        selectItem(selected);
      } else {
        const query = input.value.trim();
        if (query) {
          openDirectSearch(query);
          closeOverlay();
        }
      }
    }
  }

  function onInput() {
    const query = input.value.trim();
    if (!query) {
      searchSeq++;
      panel.clear();
      updateFooter('');
      return;
    }
    sendSearch(query);
  }

  async function openOverlay() {
    let css;
    try {
      css = await loadCss();
    } catch (_) {
      const text = pendingKeys;
      stopKeyBuffer();
      restoreBufferedText(text);
      return;
    }
    if (host) {
      input?.focus();
      flushKeyBuffer();
      return;
    }

    host = document.createElement('div');
    host.id = 'sg-overlay-host';
    host.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;pointer-events:auto;';
    shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = css;
    shadow.appendChild(style);

    const mask = document.createElement('div');
    mask.className = 'sg-overlay-mask';
    mask.addEventListener('mousedown', (event) => {
      if (event.target === mask) closeOverlay();
    });

    const box = document.createElement('div');
    box.className = 'sg-overlay-panel';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', '聚焦搜索');

    const header = document.createElement('div');
    header.className = 'sg-overlay-header';
    header.innerHTML =
      '<svg class="sg-overlay-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>';

    input = document.createElement('input');
    input.type = 'text';
    input.className = 'sg-overlay-input';
    input.placeholder = '搜索标签页、书签、历史与网页…';
    input.setAttribute('aria-label', '聚焦搜索');
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', handleKeydown);
    input.addEventListener('compositionstart', () => {
      composing = true;
    });
    input.addEventListener('compositionend', () => {
      composing = false;
    });
    header.appendChild(input);

    const results = document.createElement('div');
    results.className = 'sg-results sg-overlay-results';
    results.setAttribute('role', 'listbox');

    const footer = document.createElement('div');
    footer.className = 'sg-overlay-footer';
    const footerText = document.createElement('span');
    footerText.className = 'sg-overlay-footer-text';
    footer.appendChild(footerText);
    const esc = document.createElement('span');
    esc.className = 'sg-overlay-esc';
    esc.textContent = 'Esc 关闭';
    footer.appendChild(esc);

    box.appendChild(header);
    box.appendChild(results);
    box.appendChild(footer);
    mask.appendChild(box);
    shadow.appendChild(mask);

    document.documentElement.appendChild(host);

    panel = window.SpotlightResults.create(results, { onSelect: selectItem });

    // 阻止按键泄漏到宿主页面：聊天类页面常挂全局 keydown 监听，
    // 一旦放 Printable 键冒泡出去，页面会把焦点抢回自己的输入框
    const swallowKeys = (event) => event.stopPropagation();
    host.addEventListener('keydown', swallowKeys);
    host.addEventListener('keyup', swallowKeys);
    host.addEventListener('keypress', swallowKeys);

    // 兜底：页面若用 capture 监听抢走焦点，立刻抢回来
    document.addEventListener('focusin', keepFocus, true);

    updateFooter('');
    // 同步聚焦并灌入缓冲字符，不再等下一帧（等待期间按键会丢给宿主页面）
    input.focus();
    flushKeyBuffer();
  }

  function keepFocus() {
    // 浮层为 closed shadow，浮层内聚焦时 document.activeElement 为 host
    if (host && input && document.activeElement !== host) {
      input.focus();
    }
  }

  function closeOverlay() {
    searchSeq++;
    stopKeyBuffer();
    document.removeEventListener('focusin', keepFocus, true);
    if (host) {
      host.remove();
      host = null;
      shadow = null;
      input = null;
      panel = null;
    }
  }

  window.addEventListener('pagehide', closeOverlay);
})();
