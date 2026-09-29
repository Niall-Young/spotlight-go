(function () {
  'use strict';

  const SHORTCUTS_KEY = 'pinnedShortcuts';
  const QUICK_MODE_KEY = 'quickLinksMode';
  const CUSTOM_SHORTCUT_KEY = 'customShortcut';
  const SOURCES_KEY = 'searchSources';
  const THEME_KEY = 'themeMode';
  const STYLE_KEY = 'styleMode';
  const DEFAULT_SOURCES = { tab: true, bookmark: true, history: true };

  const i18n = window.SpotlightI18n;
  const LANG_KEY = i18n.STORAGE_KEY;

  // ---------- 分段选择器（主题 / 语言共用） ----------

  // 滑块按激活按钮实际位置/宽度平移；面板隐藏时测不到布局则跳过，
  // 待设置弹窗打开后由 showSettingsSection 再次定位
  function setupSegmented(groupEl, attr) {
    const buttons = Array.from(groupEl.querySelectorAll('button[data-' + attr + ']'));
    const pill = groupEl.querySelector('.nt-segmented-pill');

    function positionPill(animate) {
      const active = buttons.find((btn) => btn.classList.contains('is-active'));
      if (!active || !pill || active.offsetWidth === 0) return;
      if (!animate) pill.classList.add('is-instant');
      pill.style.width = active.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + active.offsetLeft + 'px)';
      if (!animate) {
        void pill.offsetWidth; // 强制 reflow，避免下次切换把初始定位也算进过渡
        pill.classList.remove('is-instant');
      }
    }

    function render(value) {
      for (const btn of buttons) {
        const active = btn.dataset[attr] === value;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-checked', String(active));
      }
      positionPill(true);
    }

    return { positionPill, render };
  }

  let quickMode = 'simple';
  const quickModeGroup = document.getElementById('nt-settings-quick-mode');
  const quickModeSegmented = setupSegmented(quickModeGroup, 'quickmode');

  function applyQuickMode(value) {
    quickMode = value === 'quick' ? 'quick' : 'simple';
    quickModeSegmented.render(quickMode);
  }

  quickModeGroup.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-quickmode]');
    if (!button) return;
    chrome.storage.local.set({ [QUICK_MODE_KEY]: button.dataset.quickmode }, () => {
      const error = document.getElementById('nt-grid-error');
      if (chrome.runtime.lastError) showFormError(error, 'quickAdd.saveError');
      else error.hidden = true;
    });
  });

  // ---------- 主题 ----------

  // themeMode：system（默认，跟随浏览器）/ light / dark；
  // 显式亮暗通过 <html data-theme> 覆盖 prefers-color-scheme 媒体查询
  function normalizeTheme(mode) {
    return mode === 'light' || mode === 'dark' ? mode : 'system';
  }

  function applyTheme(mode) {
    if (mode === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
  }

  const themeSegmented = setupSegmented(document.getElementById('nt-settings-theme'), 'theme');

  function renderTheme(mode) {
    themeSegmented.render(mode);
  }

  // ---------- 样式 ----------

  // styleMode：acrylic（默认）/ neutral / paper / pink；
  // 通过 <html data-style> 叠加在主题之上，覆盖对应的 CSS 变量与背景
  function normalizeStyle(mode) {
    return mode === 'neutral' || mode === 'paper' || mode === 'pink' ? mode : 'acrylic';
  }

  function applyStyle(mode) {
    if (mode === 'acrylic') delete document.documentElement.dataset.style;
    else document.documentElement.dataset.style = mode;
  }

  const styleCards = Array.from(
    document.querySelectorAll('#nt-settings-style button[data-style]')
  );

  function renderStyle(mode) {
    for (const btn of styleCards) {
      const active = btn.dataset.style === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    }
  }

  // ---------- 语言 ----------

  // languageMode：zh / en；缺省或旧版 system 值按浏览器语言解析，非中文一律英文
  function normalizeLang(mode) {
    if (mode === 'zh' || mode === 'en') return mode;
    return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  const langSegmented = setupSegmented(document.getElementById('nt-settings-language'), 'lang');

  function renderLang(mode) {
    langSegmented.render(mode);
  }

  // 翻译带 data-i18n* 标记的静态元素；动态生成的文案见 refreshDynamicTexts
  function applyTranslations() {
    document.documentElement.lang = i18n.getLang() === 'zh' ? 'zh-CN' : 'en';
    for (const el of document.querySelectorAll('[data-i18n]')) {
      el.textContent = i18n.t(el.dataset.i18n);
    }
    for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
      el.placeholder = i18n.t(el.dataset.i18nPlaceholder);
    }
    for (const el of document.querySelectorAll('[data-i18n-aria]')) {
      el.setAttribute('aria-label', i18n.t(el.dataset.i18nAria));
    }
    for (const el of document.querySelectorAll('[data-i18n-title]')) {
      el.title = i18n.t(el.dataset.i18nTitle);
    }
  }

  // 尽早读取并应用主题/样式/语言，尽量减少首屏闪烁
  chrome.storage.local.get([THEME_KEY, STYLE_KEY, LANG_KEY, QUICK_MODE_KEY], (data) => {
    if (chrome.runtime.lastError) return;
    const mode = normalizeTheme(data[THEME_KEY]);
    applyTheme(mode);
    renderTheme(mode);
    const style = normalizeStyle(data[STYLE_KEY]);
    applyStyle(style);
    renderStyle(style);
    renderLang(normalizeLang(data[LANG_KEY]));
    applyQuickMode(data[QUICK_MODE_KEY]);
    renderGridPage();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (QUICK_MODE_KEY in changes) {
      cancelGridDrag();
      applyQuickMode(changes[QUICK_MODE_KEY].newValue);
      renderGridPage();
    }
    if (SHORTCUTS_KEY in changes) {
      cancelGridDrag();
      renderGrid();
      renderSettingsList();
    }
    if (THEME_KEY in changes) {
      const mode = normalizeTheme(changes[THEME_KEY].newValue);
      applyTheme(mode);
      renderTheme(mode);
    }
    if (STYLE_KEY in changes) {
      const style = normalizeStyle(changes[STYLE_KEY].newValue);
      applyStyle(style);
      renderStyle(style);
    }
    if (LANG_KEY in changes) {
      renderLang(normalizeLang(changes[LANG_KEY].newValue));
    }
  });

  // 语言实际生效（含浏览器语言解析）由 i18n 模块通知：刷新静态文案、
  // 动态文案与结果面板；按钮宽度变化后需重定位分段滑块
  i18n.init(() => {
    applyTranslations();
    refreshDynamicTexts();
    themeSegmented.positionPill(true);
    langSegmented.positionPill(true);
    quickModeSegmented.positionPill(true);
  });

  document.getElementById('nt-settings-theme').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-theme]');
    if (!btn) return;
    const mode = normalizeTheme(btn.dataset.theme);
    chrome.storage.local.set({ [THEME_KEY]: mode }, () => {
      applyTheme(mode);
      renderTheme(mode);
    });
  });

  document.getElementById('nt-settings-language').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-lang]');
    if (!btn) return;
    // 只需写入 storage：onChanged 更新分段选中态，i18n 回调刷新全部文案
    chrome.storage.local.set({ [LANG_KEY]: normalizeLang(btn.dataset.lang) });
  });

  // 只需写入 storage：onChanged 统一应用样式并刷新卡片选中态
  document.getElementById('nt-settings-style').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-style]');
    if (!btn) return;
    chrome.storage.local.set({ [STYLE_KEY]: normalizeStyle(btn.dataset.style) });
  });

  const input = document.getElementById('nt-input');
  const resultsEl = document.getElementById('nt-results');
  const grid = document.getElementById('nt-grid');
  const gridTrack = document.getElementById('nt-grid-track');
  const gridPager = document.getElementById('nt-grid-pager');
  const gridPrev = document.getElementById('nt-grid-prev');
  const gridNext = document.getElementById('nt-grid-next');
  const contextMenu = document.getElementById('nt-context-menu');
  const settingsFab = document.getElementById('nt-settings-fab');
  const settingsMask = document.getElementById('nt-settings-mask');
  const settingsList = document.getElementById('nt-settings-list');
  const settingsAdd = document.getElementById('nt-settings-add');
  const settingsForm = document.getElementById('nt-settings-form');
  const settingsFormUrl = document.getElementById('nt-settings-form-url');
  const settingsFormTitle = document.getElementById('nt-settings-form-title');
  const settingsFormOk = document.getElementById('nt-settings-form-ok');
  const settingsFormCancel = document.getElementById('nt-settings-form-cancel');
  const settingsShortcut = document.getElementById('nt-settings-shortcut');
  const settingsShortcutView = document.getElementById('nt-settings-shortcut-view');
  const settingsShortcutEdit = document.getElementById('nt-settings-shortcut-edit');
  const settingsShortcutCapture = document.getElementById('nt-settings-shortcut-capture');
  const settingsShortcutPreview = document.getElementById('nt-settings-shortcut-preview');
  const settingsShortcutHint = document.getElementById('nt-settings-shortcut-hint');
  const settingsShortcutSave = document.getElementById('nt-settings-shortcut-save');
  const settingsShortcutCancel = document.getElementById('nt-settings-shortcut-cancel');
  const sourceTab = document.getElementById('nt-settings-source-tab');
  const sourceBookmark = document.getElementById('nt-settings-source-bookmark');
  const sourceHistory = document.getElementById('nt-settings-source-history');
  const settingsClose = document.getElementById('nt-settings-close');

  let searchSeq = 0;
  let composing = false;

  const panel = window.SpotlightResults.create(resultsEl, {
    onSelect: (item) => openItem(item)
  });

  // ---------- 搜索 ----------

  function looksLikeUrl(text) {
    return /^([a-z][a-z0-9+.-]*:\/\/)?[^\s.]+\.[^\s]{2,}(\/\S*)?$/i.test(text);
  }

  function normalizeUrl(text) {
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : 'https://' + text;
  }

  function openItem(item) {
    if (!item) return;
    if (item.url) {
      chrome.runtime.sendMessage({
        type: 'record-selection',
        query: input.value.trim(),
        url: item.url
      });
    }
    if (item.group === 'tab' && item.tabId != null) {
      chrome.tabs.update(item.tabId, { active: true });
      if (item.windowId != null) chrome.windows.update(item.windowId, { focused: true });
      return;
    }
    if (item.group === 'suggestion' || item.type === 'direct-search') {
      chrome.search.query({ text: item.query || item.title || '', disposition: 'CURRENT_TAB' });
      return;
    }
    if (item.url) location.href = item.url;
  }

  function doDirectSearch(query) {
    if (looksLikeUrl(query)) {
      location.href = normalizeUrl(query);
    } else {
      chrome.search.query({ text: query, disposition: 'CURRENT_TAB' });
    }
  }

  function sendSearch(query) {
    const seq = ++searchSeq;
    // 本地结果先行渲染；网络建议由后台预取，随后合并到列表尾部
    chrome.runtime.sendMessage({ type: 'search', query }, (response) => {
      if (chrome.runtime.lastError) return;
      if (seq !== searchSeq) return;
      panel.render(response?.groups, query);
      chrome.runtime.sendMessage({ type: 'search-suggestions', query }, (res) => {
        if (chrome.runtime.lastError) return;
        if (seq !== searchSeq) return;
        panel.mergeGroups({ suggestion: res?.groups?.suggestion || [] }, query);
      });
    });
  }

  input.addEventListener('input', () => {
    const query = input.value.trim();
    if (!query) {
      searchSeq++;
      panel.clear();
      return;
    }
    sendSearch(query);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (panel.hasItems() || input.value) {
        event.preventDefault();
        input.value = '';
        searchSeq++;
        panel.clear();
      }
      return;
    }
    if (composing) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      panel.moveSelection(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      panel.moveSelection(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = panel.getSelected();
      if (selected) {
        openItem(selected);
      } else {
        const query = input.value.trim();
        if (query) doDirectSearch(query);
      }
    }
  });

  input.addEventListener('compositionstart', () => {
    composing = true;
  });
  input.addEventListener('compositionend', () => {
    composing = false;
  });

  // ---------- 快捷方式 ----------

  function faviconUrl(pageUrl, size) {
    return chrome.runtime.getURL(
      '/_favicon/?pageUrl=' + encodeURIComponent(pageUrl) + '&size=' + (size || 32)
    );
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname;
    } catch (_) {
      return url || '';
    }
  }

  function loadShortcuts() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(SHORTCUTS_KEY, (data) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve(Array.isArray(data[SHORTCUTS_KEY]) ? data[SHORTCUTS_KEY] : []);
      });
    });
  }

  function saveShortcuts(shortcuts) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [SHORTCUTS_KEY]: shortcuts }, () => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        document.getElementById('nt-grid-error').hidden = true;
        resolve();
      });
    });
  }

  async function removeShortcut(entry) {
    try {
      const shortcuts = await loadShortcuts();
      await saveShortcuts(shortcuts.filter((s) => s && s.url !== entry.url));
      await renderGrid();
      await renderSettingsList();
    } catch (_) {
      showFormError(document.getElementById('nt-grid-error'), 'quickAdd.saveError');
    }
  }

  // 宫格最多展示两行；超出时底部分页箭头翻页
  const GRID_ROWS = 2;
  const TILE_WIDTH = 96;
  const TILE_GAP = 16;
  let gridPage = 0;
  let gridEntries = [];

  function gridPageSize() {
    const style = getComputedStyle(grid);
    const contentWidth = (grid.clientWidth || 760) -
      parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const cols = Math.max(1, Math.floor((contentWidth + TILE_GAP) / (TILE_WIDTH + TILE_GAP)));
    return cols * GRID_ROWS;
  }

  async function renderGrid() {
    try {
      gridEntries = (await loadShortcuts()).filter((s) => s && s.url);
      renderGridPage();
    } catch (_) {
      showFormError(document.getElementById('nt-grid-error'), 'quickAdd.saveError');
    }
  }

  function renderGridPage() {
    const pageSize = gridPageSize();
    const pages = Math.max(1, Math.ceil((gridEntries.length + (quickMode === 'quick' ? 1 : 0)) / pageSize));
    gridPage = Math.min(Math.max(gridPage, 0), pages - 1);
    gridTrack.textContent = '';
    for (let p = 0; p < pages; p++) {
      const pageEl = document.createElement('div');
      pageEl.className = 'nt-grid-page';
      pageEl.inert = p !== gridPage;
      const start = p * pageSize;
      gridEntries.slice(start, start + pageSize).forEach((entry, i) => {
        const tile = buildTile({
          title: entry.title || hostOf(entry.url),
          url: entry.url
        });
        tile.dataset.index = String(start + i);
        setupTileDrag(tile);
        pageEl.appendChild(tile);
      });
      if (quickMode === 'quick' && p === pages - 1) pageEl.appendChild(buildAddTile());
      gridTrack.appendChild(pageEl);
    }
    // 重建（加载/拖拽/resize）时不播滑动动画，直接落位
    gridTrack.classList.add('nt-grid-track-instant');
    gridTrack.style.transform = 'translateX(' + -gridPage * 100 + '%)';
    void gridTrack.offsetWidth;
    gridTrack.classList.remove('nt-grid-track-instant');
    gridPager.hidden = pages <= 1;
    gridPrev.disabled = gridPage === 0;
    gridNext.disabled = gridPage >= pages - 1;
  }

  // 翻页只动轨道位移，不重建瓦片，避免图标重复加载闪烁
  function goToGridPage(page) {
    if (gridDrag) return;
    const pageSize = gridPageSize();
    const pages = Math.max(1, Math.ceil((gridEntries.length + (quickMode === 'quick' ? 1 : 0)) / pageSize));
    gridPage = Math.min(Math.max(page, 0), pages - 1);
    Array.from(gridTrack.children).forEach((pageEl, index) => { pageEl.inert = index !== gridPage; });
    gridTrack.style.transform = 'translateX(' + -gridPage * 100 + '%)';
    gridPrev.disabled = gridPage === 0;
    gridNext.disabled = gridPage >= pages - 1;
  }

  // ---------- 宫格拖拽排序 ----------

  // 固定开始拖拽时的几何位置，CSS 排序预览不会改变命中区域。
  // 加号卡片没有 data-index，不进入网站排序。
  let gridDrag = null;
  let gridSaving = false;

  function cancelGridDrag() {
    if (!gridDrag) return;
    gridDrag = null;
    renderGridPage();
  }

  function setupTileDrag(tile) {
    tile.draggable = true;
    tile.addEventListener('dragstart', (event) => {
      if (gridSaving) { event.preventDefault(); return; }
      const page = tile.parentElement;
      const tiles = Array.from(page.querySelectorAll('[data-index]'));
      gridDrag = {
        tile, page, tiles, start: Number(tiles[0].dataset.index),
        source: tiles.indexOf(tile), target: tiles.indexOf(tile),
        slots: tiles.map((item) => item.getBoundingClientRect()),
        entries: gridEntries.slice()
      };
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', tile.dataset.index);
      requestAnimationFrame(() => {
        if (gridDrag && gridDrag.tile === tile) tile.classList.add('nt-tile-dragging');
      });
    });
    tile.addEventListener('dragend', cancelGridDrag);
  }

  function previewGridDrop(event) {
    const drag = gridDrag;
    if (!drag) return;
    // 先找最近的一行，再找该行最近的水平槽位；上下半部行为一致。
    const rowDistance = Math.min(...drag.slots.map((rect) =>
      Math.abs(event.clientY - (rect.top + rect.height / 2))));
    let target = drag.source;
    let distance = Infinity;
    drag.slots.forEach((rect, index) => {
      if (Math.abs(event.clientY - (rect.top + rect.height / 2)) > rowDistance + 1) return;
      const dx = Math.abs(event.clientX - (rect.left + rect.width / 2));
      if (dx < distance) { distance = dx; target = index; }
    });
    if (target === drag.target) return;
    drag.target = target;
    const tiles = drag.tiles.slice();
    tiles.splice(drag.source, 1);
    tiles.splice(target, 0, drag.tile);
    // 不挪动正在拖拽的 DOM 节点，否则 Chromium 可能提前终止原生拖拽。
    tiles.forEach((tile, index) => { tile.style.order = String(index); });
    const addTile = drag.page.querySelector('.nt-tile-add');
    if (addTile) addTile.style.order = String(tiles.length);
  }

  grid.addEventListener('dragenter', (event) => {
    if (gridDrag) event.preventDefault();
  });

  grid.addEventListener('dragover', (event) => {
    if (!gridDrag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    previewGridDrop(event);
  });

  grid.addEventListener('drop', async (event) => {
    if (!gridDrag) return;
    event.preventDefault();
    previewGridDrop(event);
    const drag = gridDrag;
    gridDrag = null;
    if (drag.source === drag.target) { renderGridPage(); return; }
    const next = drag.entries.slice();
    const [entry] = next.splice(drag.start + drag.source, 1);
    next.splice(drag.start + drag.target, 0, entry);
    gridSaving = true;
    gridEntries = next;
    renderGridPage();
    const error = document.getElementById('nt-grid-error');
    error.hidden = true;
    try {
      await saveShortcuts(next);
    } catch (_) {
      gridEntries = drag.entries;
      renderGridPage();
      showFormError(error, 'quickAdd.saveError');
    } finally {
      gridSaving = false;
    }
  });

  gridPrev.addEventListener('click', () => {
    goToGridPage(gridPage - 1);
  });
  gridNext.addEventListener('click', () => {
    goToGridPage(gridPage + 1);
  });

  // 窗口变宽/窄会改变每行列数，需重算分页
  let gridResizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(gridResizeTimer);
    gridResizeTimer = setTimeout(() => { cancelGridDrag(); renderGridPage(); }, 150);
  });

  // ---------- 设置弹窗 ----------

  const IS_MAC = /mac/i.test(navigator.platform || '');
  const DEFAULT_SHORTCUT_LABEL = IS_MAC ? '⌥ Space' : 'Ctrl+Shift+K';

  // 快捷键以 chrome.commands 字符串格式存储（如 "Alt+Space"），overlay 侧解析复用
  function formatShortcutLabel(shortcut) {
    if (!shortcut) return DEFAULT_SHORTCUT_LABEL;
    const parts = shortcut.split('+');
    const key = parts.pop();
    const modMap = IS_MAC
      ? { Ctrl: '⌃', Command: '⌘', Alt: '⌥', Shift: '⇧' }
      : { Ctrl: 'Ctrl', Command: 'Meta', Alt: 'Alt', Shift: 'Shift' };
    const mods = parts.map((p) => modMap[p] || p);
    if (IS_MAC) return mods.join('') + (key === 'Space' ? ' Space' : key);
    return [...mods, key].join('+');
  }

  function refreshShortcutLabel() {
    // 自定义快捷键优先；未自定义时读 chrome.commands 当前绑定，失败回退 manifest 默认键
    chrome.storage.local.get(CUSTOM_SHORTCUT_KEY, (data) => {
      if (chrome.runtime.lastError) return;
      const custom = data[CUSTOM_SHORTCUT_KEY];
      if (custom) {
        settingsShortcut.textContent = formatShortcutLabel(custom);
        return;
      }
      settingsShortcut.textContent = DEFAULT_SHORTCUT_LABEL;
      try {
        chrome.commands.getAll((commands) => {
          if (chrome.runtime.lastError) return;
          const cmd = (commands || []).find((c) => c.name === 'show-search');
          if (cmd && cmd.shortcut) {
            settingsShortcut.textContent = formatShortcutLabel(cmd.shortcut);
          }
        });
      } catch (_) {
        /* 忽略：保持默认展示 */
      }
    });
  }

  // 按下捕获：Chrome 不允许扩展程序化改键（无 commands.update），
  // 这里把组合键存入 storage，overlay 的页面内监听据此唤起浮层
  let capturing = false;
  let capturedShortcut = null;

  // 录入期间通知 background 忽略浏览器级快捷键（chrome.commands 在浏览器层
  // 拦截按键，页面收不到 keydown，否则会直接触发唤起）
  function setCaptureFlag(active) {
    try {
      chrome.runtime.sendMessage({ type: 'shortcut-capture', active });
    } catch (_) {
      /* 忽略：上下文失效 */
    }
  }

  // 浏览器级快捷键会被 Chrome 拦截、无法录入，给出明确提示
  function refreshCaptureHint() {
    try {
      chrome.commands.getAll((commands) => {
        if (chrome.runtime.lastError || !capturing) return;
        const cmd = (commands || []).find((c) => c.name === 'show-search');
        if (cmd && cmd.shortcut) {
          settingsShortcutHint.textContent = i18n.t('settings.shortcut.browserHint', {
            shortcut: formatShortcutLabel(cmd.shortcut)
          });
          settingsShortcutHint.hidden = false;
        } else {
          settingsShortcutHint.hidden = true;
        }
      });
    } catch (_) {
      /* 忽略：保持提示隐藏 */
    }
  }

  function startCapture() {
    capturing = true;
    capturedShortcut = null;
    settingsShortcutView.hidden = true;
    settingsShortcutCapture.hidden = false;
    settingsShortcutHint.hidden = true;
    settingsShortcutPreview.textContent = i18n.t('settings.shortcut.press');
    settingsShortcutPreview.classList.remove('nt-kbd-ready');
    settingsShortcutSave.disabled = true;
    setCaptureFlag(true);
    refreshCaptureHint();
  }

  function stopCapture() {
    if (capturing) setCaptureFlag(false);
    capturing = false;
    capturedShortcut = null;
    settingsShortcutCapture.hidden = true;
    settingsShortcutHint.hidden = true;
    settingsShortcutView.hidden = false;
  }

  // 录入中切走或关闭标签页时解除 background 的忽略标记
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && capturing) setCaptureFlag(false);
  });
  window.addEventListener('pagehide', () => {
    if (capturing) setCaptureFlag(false);
  });

  // 组合键必须含修饰键，避免劫持普通输入；单独按修饰键不产生组合
  function comboFromEvent(event) {
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return null;
    const mods = [];
    if (event.ctrlKey) mods.push('Ctrl');
    if (event.metaKey) mods.push('Command');
    if (event.altKey) mods.push('Alt');
    if (event.shiftKey) mods.push('Shift');
    if (mods.length === 0) return null;
    // 键名取自 event.code（物理键位），与 overlay 端按 code 匹配的逻辑一致；
    // 用 event.key 会在标点键（; , 等）上产出无法匹配的名字
    const code = event.code || '';
    let keyName;
    if (/^Key[A-Z]$/.test(code)) keyName = code.slice(3);
    else if (/^Digit[0-9]$/.test(code)) keyName = code.slice(5);
    else keyName = code || event.key;
    return [...mods, keyName].join('+');
  }

  document.addEventListener('keydown', (event) => {
    if (!capturing) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape') {
      stopCapture();
      return;
    }
    const combo = comboFromEvent(event);
    if (!combo) return;
    capturedShortcut = combo;
    settingsShortcutPreview.textContent = formatShortcutLabel(combo);
    settingsShortcutPreview.classList.add('nt-kbd-ready');
    settingsShortcutSave.disabled = false;
  }, true);

  settingsShortcutEdit.addEventListener('click', startCapture);
  settingsShortcutCancel.addEventListener('click', stopCapture);
  settingsShortcutSave.addEventListener('click', () => {
    if (!capturedShortcut) return;
    chrome.storage.local.set({ [CUSTOM_SHORTCUT_KEY]: capturedShortcut }, () => {
      stopCapture();
      refreshShortcutLabel();
    });
  });

  // ---------- 搜索内容开关 ----------

  function loadSources() {
    return new Promise((resolve) => {
      chrome.storage.local.get(SOURCES_KEY, (data) => {
        const stored = data[SOURCES_KEY];
        resolve({ ...DEFAULT_SOURCES, ...(stored && typeof stored === 'object' ? stored : {}) });
      });
    });
  }

  async function renderSources() {
    const sources = await loadSources();
    sourceTab.checked = sources.tab;
    sourceBookmark.checked = sources.bookmark;
    sourceHistory.checked = sources.history;
  }

  async function onSourceChange() {
    const sources = await loadSources();
    sources.tab = sourceTab.checked;
    sources.bookmark = sourceBookmark.checked;
    sources.history = sourceHistory.checked;
    chrome.storage.local.set({ [SOURCES_KEY]: sources });
  }

  sourceTab.addEventListener('change', onSourceChange);
  sourceBookmark.addEventListener('change', onSourceChange);
  sourceHistory.addEventListener('change', onSourceChange);

  // ---------- 设置弹窗：打开/关闭 ----------

  // 左侧菜单：通用 / 快速入口 / 外观，一次只展示一个分区
  const settingsNavItems = Array.from(
    settingsMask.querySelectorAll('.nt-settings-nav-item')
  );
  const settingsNavPill = settingsMask.querySelector('.nt-settings-nav-pill');
  const settingsSections = Array.from(
    settingsMask.querySelectorAll('.nt-settings-section')
  );

  function showSettingsSection(name) {
    for (const item of settingsNavItems) {
      item.classList.toggle('is-active', item.dataset.section === name);
    }
    for (const section of settingsSections) {
      section.hidden = section.dataset.section !== name;
    }
    // 滑块按激活项实际位置/高度平移，避免依赖固定的行高假设
    const active = settingsNavItems.find((item) => item.dataset.section === name);
    if (active && settingsNavPill) {
      settingsNavPill.style.height = active.offsetHeight + 'px';
      settingsNavPill.style.transform = 'translateY(' + active.offsetTop + 'px)';
    }
    // 主题/语言分段滑块在面板可见后才能测到布局，这里补齐初始定位（不做过渡）
    themeSegmented.positionPill(false);
    langSegmented.positionPill(false);
    quickModeSegmented.positionPill(false);
  }

  for (const item of settingsNavItems) {
    item.addEventListener('click', () => showSettingsSection(item.dataset.section));
  }

  async function openSettings(editEntry) {
    stopCapture();
    closeForm();
    settingsMask.hidden = false;
    // 从宫格右键「编辑」进入时直达快速入口分区；
    // 须在弹窗可见后调用，滑块才能测到菜单项位置
    showSettingsSection(editEntry ? 'shortcuts' : 'general');
    refreshShortcutLabel();
    renderSources();
    await renderSettingsList();
    if (editEntry && !settingsMask.hidden) openForm(editEntry);
  }

  function closeSettings() {
    stopCapture();
    closeForm();
    settingsMask.hidden = true;
  }

  settingsFab.addEventListener('click', () => openSettings());
  settingsClose.addEventListener('click', closeSettings);
  settingsMask.addEventListener('mousedown', (event) => {
    if (event.target === settingsMask) closeSettings();
  });

  // ---------- 快速入口：卡片列表 + 内联表单 ----------

  // formEntry：undefined = 表单关闭；null = 新增；entry 对象 = 编辑该项
  let formEntry;

  // 设置弹窗内的快速入口列表：新增/编辑/删除在此完成，保存后同步刷新外面宫格
  async function renderSettingsList() {
    let shortcuts;
    try { shortcuts = await loadShortcuts(); }
    catch (_) { showFormError(document.getElementById('nt-grid-error'), 'quickAdd.saveError'); return; }
    // 表单可能位于列表内，清空列表前先保留，避免后续新增引用已脱离 DOM。
    const formOpen = formEntry !== undefined;
    settingsList.before(settingsForm);
    settingsList.textContent = '';
    const entries = shortcuts.filter((s) => s && s.url);
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'nt-settings-empty';
      empty.textContent = i18n.t('settings.shortcuts.empty');
      settingsList.appendChild(empty);
      return;
    }
    for (const entry of entries) {
      settingsList.appendChild(buildSettingsItem(entry));
    }
    if (formOpen) settingsList.prepend(settingsForm);
  }

  function buildSettingsItem(entry) {
    const row = document.createElement('div');
    row.className = 'nt-settings-item';

    const icon = document.createElement('div');
    icon.className = 'nt-settings-item-icon';
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = faviconUrl(entry.url);
    icon.appendChild(img);
    row.appendChild(icon);

    const text = document.createElement('div');
    text.className = 'nt-settings-item-text';
    const title = document.createElement('div');
    title.className = 'nt-settings-item-title';
    title.textContent = entry.title || hostOf(entry.url);
    const url = document.createElement('div');
    url.className = 'nt-settings-item-url';
    url.textContent = entry.url;
    text.appendChild(title);
    text.appendChild(url);
    row.appendChild(text);

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'nt-settings-item-action';
    edit.textContent = i18n.t('common.edit');
    edit.addEventListener('click', () => openForm(entry, row));
    row.appendChild(edit);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'nt-settings-item-action';
    remove.textContent = i18n.t('common.delete');
    remove.addEventListener('click', async () => {
      if (formEntry && formEntry.url === entry.url) closeForm();
      await removeShortcut(entry);
    });
    row.appendChild(remove);

    return row;
  }

  // 内联表单：编辑时插入到对应卡片之后，新增时插入到列表顶部
  function openForm(entry, afterRow) {
    formEntry = entry || null;
    document.getElementById('nt-settings-form-error').hidden = true;
    settingsFormOk.textContent = formEntry ? i18n.t('common.save') : i18n.t('common.add');
    settingsFormUrl.value = formEntry ? formEntry.url : '';
    settingsFormTitle.value = formEntry ? formEntry.title || '' : '';
    settingsForm.hidden = false;
    settingsAdd.hidden = true;
    if (afterRow) settingsList.insertBefore(settingsForm, afterRow.nextSibling);
    else settingsList.insertBefore(settingsForm, settingsList.firstChild);
    settingsFormUrl.focus();
  }

  function closeForm() {
    formEntry = undefined;
    settingsForm.hidden = true;
    settingsAdd.hidden = false;
  }

  settingsAdd.addEventListener('click', () => openForm(null));
  settingsFormCancel.addEventListener('click', closeForm);

  function showFormError(element, key) {
    element.dataset.i18n = key;
    element.textContent = i18n.t(key);
    element.hidden = false;
  }

  function readShortcut(urlInput, titleInput, error) {
    error.hidden = true;
    const raw = urlInput.value.trim();
    const url = normalizeUrl(raw);
    try {
      if (!raw || /\s/.test(raw)) throw new Error('Invalid URL');
      new URL(url);
    } catch (_) {
      showFormError(error, 'quickAdd.invalidUrl');
      urlInput.focus();
      return null;
    }
    return { url, title: titleInput.value.trim() || hostOf(url) };
  }

  // 设置与首页 dialog 共用规范化后的保存规则；重复网址保留一份。
  async function persistShortcut(entry, original) {
    const shortcuts = await loadShortcuts();
    const next = [];
    let replaced = false;
    for (const item of shortcuts) {
      if (!item || !item.url) continue;
      if (original && item.url === original.url && !replaced) {
        next.push(entry);
        replaced = true;
      } else if (item.url !== entry.url) next.push(item);
    }
    if (!replaced) next.push(entry);
    await saveShortcuts(next);
    return next;
  }

  let formSaving = false;
  async function submitForm() {
    if (formSaving) return;
    const error = document.getElementById('nt-settings-form-error');
    const entry = readShortcut(settingsFormUrl, settingsFormTitle, error);
    if (!entry) return;
    formSaving = true;
    settingsFormOk.disabled = true;
    try {
      await persistShortcut(entry, formEntry);
      closeForm();
      await renderSettingsList();
      await renderGrid();
    } catch (_) {
      showFormError(error, 'quickAdd.saveError');
    } finally {
      formSaving = false;
      settingsFormOk.disabled = false;
    }
  }

  const addDialog = document.getElementById('nt-add-dialog');
  const addForm = document.getElementById('nt-add-form');
  const addUrl = document.getElementById('nt-add-url');
  const addName = document.getElementById('nt-add-name');
  const addError = document.getElementById('nt-add-error');
  const addSubmit = document.getElementById('nt-add-submit');
  const addCancel = document.getElementById('nt-add-cancel');
  let addSaving = false;

  function buildAddTile() {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'nt-tile nt-tile-add';
    tile.setAttribute('aria-label', i18n.t('quickAdd.title'));
    const icon = document.createElement('span');
    icon.className = 'nt-tile-icon';
    icon.textContent = '+';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'nt-tile-title';
    label.textContent = i18n.t('common.add');
    tile.append(icon, label);
    tile.addEventListener('click', () => {
      addForm.reset();
      addError.hidden = true;
      addDialog.showModal();
      addUrl.focus();
    });
    return tile;
  }

  addCancel.addEventListener('click', () => addDialog.close());
  addDialog.addEventListener('cancel', (event) => {
    if (addSaving) event.preventDefault();
  });
  addDialog.addEventListener('close', () => {
    const page = gridTrack.children[gridPage];
    const addTile = page && page.querySelector('.nt-tile-add');
    (addTile || input).focus();
  });
  addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (addSaving) return;
    const entry = readShortcut(addUrl, addName, addError);
    if (!entry) return;
    addSaving = true;
    addSubmit.disabled = addCancel.disabled = true;
    addUrl.readOnly = addName.readOnly = true;
    try {
      const next = await persistShortcut(entry, null);
      gridEntries = next.filter((item) => item && item.url);
      gridPage = Math.floor(gridEntries.findIndex((item) => item.url === entry.url) / gridPageSize());
      renderGridPage();
      addDialog.close();
    } catch (_) {
      showFormError(addError, 'quickAdd.saveError');
      addUrl.focus();
    } finally {
      addSaving = false;
      addSubmit.disabled = addCancel.disabled = false;
      addUrl.readOnly = addName.readOnly = false;
    }
  });

  settingsFormOk.addEventListener('click', submitForm);
  [settingsFormUrl, settingsFormTitle].forEach((el) => {
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        submitForm();
      }
    });
  });

  function buildTile(entry) {
    const tile = document.createElement('div');
    tile.className = 'nt-tile';
    tile.title = entry.url;

    const icon = document.createElement('div');
    icon.className = 'nt-tile-icon';
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = faviconUrl(entry.url);
    icon.appendChild(img);
    tile.appendChild(icon);

    const title = document.createElement('div');
    title.className = 'nt-tile-title';
    title.textContent = entry.title;
    tile.appendChild(title);

    tile.addEventListener('click', () => {
      location.href = entry.url;
    });
    tile.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      showContextMenu(event.clientX, event.clientY, entry);
    });
    return tile;
  }

  // ---------- 右键菜单 ----------

  let menuEntry = null;

  // 语言切换时刷新动态生成的文案：内联表单按钮、快捷键录入占位、
  // 快速入口列表与结果面板（静态元素由 applyTranslations 处理）
  function refreshDynamicTexts() {
    if (formEntry !== undefined) {
      settingsFormOk.textContent = formEntry ? i18n.t('common.save') : i18n.t('common.add');
    }
    if (!capturing) {
      settingsShortcutPreview.textContent = i18n.t('settings.shortcut.press');
    }
    renderSettingsList();
    if (!gridDrag) renderGridPage();
    panel.repaint();
  }

  function showContextMenu(x, y, entry) {
    menuEntry = entry;
    contextMenu.textContent = '';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = i18n.t('common.edit');
    edit.addEventListener('click', () => {
      hideContextMenu();
      openSettings(entry);
    });
    contextMenu.appendChild(edit);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = i18n.t('common.delete');
    remove.addEventListener('click', async () => {
      hideContextMenu();
      await removeShortcut(entry);
    });
    contextMenu.appendChild(remove);

    const openNew = document.createElement('button');
    openNew.type = 'button';
    openNew.textContent = i18n.t('common.openInNewTab');
    openNew.addEventListener('click', () => {
      hideContextMenu();
      chrome.tabs.create({ url: entry.url });
    });
    contextMenu.appendChild(openNew);

    contextMenu.hidden = false;
    const rect = contextMenu.getBoundingClientRect();
    contextMenu.style.left = Math.min(x, window.innerWidth - rect.width - 8) + 'px';
    contextMenu.style.top = Math.min(y, window.innerHeight - rect.height - 8) + 'px';
  }

  function hideContextMenu() {
    contextMenu.hidden = true;
    menuEntry = null;
  }

  document.addEventListener('click', () => hideContextMenu());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (addDialog.open) return;
      cancelGridDrag();
      hideContextMenu();
      if (formEntry !== undefined) {
        closeForm();
        return;
      }
      closeSettings();
    }
  });
  window.addEventListener('blur', hideContextMenu);

  window.addEventListener('spotlight:shortcuts-imported', () => {
    closeForm();
    renderSettingsList();
    renderGrid();
  });

  renderGrid();
  input.focus();
})();
