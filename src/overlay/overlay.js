(function () {
  'use strict';

  const CUSTOM_SHORTCUT_KEY = 'customShortcut';
  const THEME_KEY = 'themeMode';
  const STYLE_KEY = 'styleMode';

  let host = null;
  let shadow = null;
  let maskEl = null;
  let input = null;
  let panel = null;
  let searchSeq = 0;
  let composing = false;
  let cssPromise = null;
  let pendingKeys = null;
  let trigger = null;
  let themeMode = 'system';
  let styleMode = 'acrylic';

  // 主题：system（跟随浏览器）/ light / dark，作用于浮层的 data-sg-theme 属性
  function applyTheme() {
    if (!maskEl) return;
    if (themeMode === 'system') delete maskEl.dataset.sgTheme;
    else maskEl.dataset.sgTheme = themeMode;
  }

  // 样式：acrylic（默认）/ neutral / paper / pink，作用于浮层的 data-sg-style 属性
  function normalizeStyle(mode) {
    return mode === 'neutral' || mode === 'paper' || mode === 'pink' ? mode : 'acrylic';
  }

  function applyStyle() {
    if (!maskEl) return;
    if (styleMode === 'acrylic') delete maskEl.dataset.sgStyle;
    else maskEl.dataset.sgStyle = styleMode;
  }

  try {
    chrome.storage.local.get([THEME_KEY, STYLE_KEY], (data) => {
      if (chrome.runtime.lastError) return;
      const mode = data[THEME_KEY];
      themeMode = mode === 'light' || mode === 'dark' ? mode : 'system';
      applyTheme();
      styleMode = normalizeStyle(data[STYLE_KEY]);
      applyStyle();
    });
  } catch (_) {
    /* 忽略：上下文失效 */
  }

  const i18n = window.SpotlightI18n;

  // 语言切换时若浮层已打开，就地刷新文案与结果分组，无需重开
  function applyLang() {
    if (!shadow || !input) return;
    input.placeholder = i18n.t('overlay.placeholder');
    input.setAttribute('aria-label', i18n.t('app.name'));
    const box = shadow.querySelector('.sg-overlay-panel');
    if (box) box.setAttribute('aria-label', i18n.t('app.name'));
    const esc = shadow.querySelector('.sg-overlay-esc');
    if (esc) esc.textContent = i18n.t('overlay.esc');
    if (panel) panel.repaint();
    updateFooter(input.value.trim());
  }

  i18n.init(applyLang);

  function loadCss() {
    if (!cssPromise) {
      // 附加随机参数防止扩展重载后 fetch 命中 HTTP 缓存里的旧 CSS
      const bust = '?v=' + Date.now();
      cssPromise = Promise.all([
        fetch(chrome.runtime.getURL('src/shared/results-panel.css') + bust).then((r) => r.text()),
        fetch(chrome.runtime.getURL('src/overlay/overlay.css') + bust).then((r) => r.text())
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
  }

  function stopKeyBuffer() {
    if (pendingKeys === null) return;
    pendingKeys = null;
  }

  function bufferKeydown(event) {
    if (pendingKeys === null) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Backspace') {
      pendingKeys = pendingKeys.slice(0, -1);
    } else if (event.key.length === 1) {
      pendingKeys += event.key;
    } else {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
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
  // 快捷键 keydown 时同步打开浮层，不等消息；绑定优先级：设置弹窗保存的
  // 自定义快捷键 > chrome.commands 当前绑定 > manifest 默认键。
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
    // 设置弹窗里捕获的自定义快捷键优先；未设置时跟随 chrome.commands 绑定
    try {
      chrome.storage.local.get(CUSTOM_SHORTCUT_KEY, (data) => {
        if (chrome.runtime.lastError) return;
        const parsed = parseShortcut(data[CUSTOM_SHORTCUT_KEY]);
        if (parsed) {
          trigger = parsed;
          return;
        }
        loadCommandTrigger();
      });
    } catch (_) {
      // 扩展上下文失效（如扩展刚重载），保留默认绑定
    }
  }

  function loadCommandTrigger() {
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

  // 设置弹窗保存自定义快捷键/主题后，已打开页面无需刷新即生效
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (CUSTOM_SHORTCUT_KEY in changes) {
        trigger = null;
        loadTrigger();
      }
      if (THEME_KEY in changes) {
        const mode = changes[THEME_KEY].newValue;
        themeMode = mode === 'light' || mode === 'dark' ? mode : 'system';
        applyTheme();
      }
      if (STYLE_KEY in changes) {
        styleMode = normalizeStyle(changes[STYLE_KEY].newValue);
        applyStyle();
      }
    });
  } catch (_) {
    /* 忽略：上下文失效 */
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

  function isNavKey(event) {
    return event.key === 'Escape' || event.key === 'Tab' || event.key === 'Enter';
  }

  // 统一的 window 捕获层按键处理。内容脚本 document_start 注册，捕获阶段
  // 先于宿主页面任何监听触发，故能抢在页面前拦下按键：
  // - 浮层未开时识别唤起快捷键；
  // - 唤起过渡期缓冲已敲字符；
  // - 浮层打开后对整个生命周期持续拦截，杜绝聊天类页面的全局 keydown
  //   监听在事件到达输入框前抢走首字符（首字母被吞的根因）。
  function captureKeyDown(event) {
    if (!event.isTrusted) return;

    if (!host) {
      if (pendingKeys !== null) {
        bufferKeydown(event);
        return;
      }
      if (matchesTrigger(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        startKeyBuffer();
        openOverlay();
      }
      return;
    }

    if (composing || event.isComposing) {
      event.stopImmediatePropagation();
      return;
    }
    if (isNavKey(event)) handleKeydown(event);
    // 只阻断向宿主页面的传播，不 preventDefault 可打印键，
    // 让浏览器默认行为把字符写进已聚焦的输入框。
    event.stopImmediatePropagation();
  }

  function captureKeyPress(event) {
    if (!event.isTrusted) return;
    if (!host && pendingKeys === null) return;
    event.stopImmediatePropagation();
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

  // 在页面脚本注册按键监听前占位；唤起、过渡、打开三态统一在此拦截。
  window.addEventListener('keydown', captureKeyDown, true);
  window.addEventListener('keypress', captureKeyPress, true);
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
        ? i18n.t('overlay.footerSelect')
        : i18n.t('overlay.footerSearch', { query })
      : i18n.t('overlay.footerIdle');
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
    maskEl = mask;
    applyTheme();
    applyStyle();
    mask.addEventListener('mousedown', (event) => {
      if (event.target === mask) closeOverlay();
    });

    const box = document.createElement('div');
    box.className = 'sg-overlay-panel';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', i18n.t('app.name'));

    const header = document.createElement('div');
    header.className = 'sg-overlay-header';
    header.innerHTML =
      '<svg class="sg-overlay-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>';

    input = document.createElement('input');
    input.type = 'text';
    input.className = 'sg-overlay-input';
    input.placeholder = i18n.t('overlay.placeholder');
    input.setAttribute('aria-label', i18n.t('app.name'));
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.addEventListener('input', onInput);
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
    esc.textContent = i18n.t('overlay.esc');
    footer.appendChild(esc);

    box.appendChild(header);
    box.appendChild(results);
    box.appendChild(footer);

    // 面板包一层定位容器，贴纸装饰（仅少女粉样式显示）探出面板右上角
    const wrap = document.createElement('div');
    wrap.className = 'sg-overlay-panel-wrap';
    const deco = document.createElement('img');
    deco.className = 'sg-overlay-deco';
    deco.src = chrome.runtime.getURL('assets/pink-girl.png');
    deco.alt = '';
    deco.setAttribute('aria-hidden', 'true');
    wrap.appendChild(deco);
    wrap.appendChild(box);
    mask.appendChild(wrap);
    shadow.appendChild(mask);

    document.documentElement.appendChild(host);

    panel = window.SpotlightResults.create(results, { onSelect: selectItem });

    // 按键拦截已上移到 window 捕获层（captureKeyDown），先于宿主页面监听
    // 触发并掐断传播，无需再在 host 上做冒泡拦截。

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
      maskEl = null;
      input = null;
      panel = null;
    }
  }

  window.addEventListener('pagehide', closeOverlay);
})();
