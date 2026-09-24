(function () {
  'use strict';

  const SHORTCUTS_KEY = 'pinnedShortcuts';
  const CUSTOM_SHORTCUT_KEY = 'customShortcut';
  const SOURCES_KEY = 'searchSources';
  const DEFAULT_SOURCES = { bookmark: true, history: true };

  const input = document.getElementById('nt-input');
  const resultsEl = document.getElementById('nt-results');
  const grid = document.getElementById('nt-grid');
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
  const settingsShortcutSave = document.getElementById('nt-settings-shortcut-save');
  const settingsShortcutCancel = document.getElementById('nt-settings-shortcut-cancel');
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
    return new Promise((resolve) => {
      chrome.storage.local.get(SHORTCUTS_KEY, (data) => {
        resolve(Array.isArray(data[SHORTCUTS_KEY]) ? data[SHORTCUTS_KEY] : []);
      });
    });
  }

  function saveShortcuts(shortcuts) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [SHORTCUTS_KEY]: shortcuts }, resolve);
    });
  }

  // 宫格最多展示两行；超出时底部分页箭头翻页
  const GRID_ROWS = 2;
  const TILE_WIDTH = 96;
  const TILE_GAP = 16;
  let gridPage = 0;
  let gridEntries = [];

  function gridPageSize() {
    const cols = Math.max(
      1,
      Math.floor(((grid.clientWidth || 760) + TILE_GAP) / (TILE_WIDTH + TILE_GAP))
    );
    return cols * GRID_ROWS;
  }

  async function renderGrid() {
    gridEntries = (await loadShortcuts()).filter((s) => s && s.url);
    renderGridPage();
  }

  function renderGridPage() {
    const pageSize = gridPageSize();
    const pages = Math.max(1, Math.ceil(gridEntries.length / pageSize));
    gridPage = Math.min(Math.max(gridPage, 0), pages - 1);
    grid.textContent = '';
    const start = gridPage * pageSize;
    gridEntries.slice(start, start + pageSize).forEach((entry, i) => {
      const tile = buildTile({
        title: entry.title || hostOf(entry.url),
        url: entry.url
      });
      tile.dataset.index = String(start + i);
      setupTileDrag(tile);
      grid.appendChild(tile);
    });
    grid.classList.toggle('nt-grid-paged', pages > 1);
    gridPager.hidden = pages <= 1;
    gridPrev.disabled = gridPage === 0;
    gridNext.disabled = gridPage >= pages - 1;
  }

  // ---------- 宫格拖拽排序 ----------

  // 拖拽经过其他瓦片时直接移动 DOM 实时预览落点；
  // drop 时按 DOM 顺序重排 gridEntries 并持久化，dragend 统一重渲染校正索引
  let dragTile = null;

  function setupTileDrag(tile) {
    tile.draggable = true;
    tile.addEventListener('dragstart', (event) => {
      dragTile = tile;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', tile.dataset.index || '');
      // 延迟到拖拽影像生成后再加半透明，避免残影也变淡
      requestAnimationFrame(() => tile.classList.add('nt-tile-dragging'));
    });
    tile.addEventListener('dragend', () => {
      tile.classList.remove('nt-tile-dragging');
      dragTile = null;
      renderGridPage();
    });
  }

  grid.addEventListener('dragover', (event) => {
    if (!dragTile) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const target = event.target.closest('.nt-tile');
    if (!target || target === dragTile) return;
    const rect = target.getBoundingClientRect();
    // 同行内按水平中点、跨行按垂直中点判断插到目标前还是后
    const after =
      event.clientY > rect.top + rect.height / 2 ||
      (event.clientY > rect.top && event.clientX > rect.left + rect.width / 2);
    grid.insertBefore(dragTile, after ? target.nextSibling : target);
  });

  grid.addEventListener('drop', (event) => {
    if (!dragTile) return;
    event.preventDefault();
    const order = Array.from(grid.querySelectorAll('.nt-tile'))
      .map((tile) => Number(tile.dataset.index))
      .filter((i) => Number.isInteger(i));
    if (order.length === 0) return;
    const reordered = order.map((i) => gridEntries[i]);
    gridEntries.splice(gridPage * gridPageSize(), reordered.length, ...reordered);
    saveShortcuts(gridEntries);
  });

  gridPrev.addEventListener('click', () => {
    gridPage--;
    renderGridPage();
  });
  gridNext.addEventListener('click', () => {
    gridPage++;
    renderGridPage();
  });

  // 窗口变宽/窄会改变每行列数，需重算分页
  let gridResizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(gridResizeTimer);
    gridResizeTimer = setTimeout(renderGridPage, 150);
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

  function startCapture() {
    capturing = true;
    capturedShortcut = null;
    settingsShortcutView.hidden = true;
    settingsShortcutCapture.hidden = false;
    settingsShortcutPreview.textContent = '按下新的快捷键…';
    settingsShortcutPreview.classList.remove('nt-kbd-ready');
    settingsShortcutSave.disabled = true;
  }

  function stopCapture() {
    capturing = false;
    capturedShortcut = null;
    settingsShortcutCapture.hidden = true;
    settingsShortcutView.hidden = false;
  }

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
    sourceBookmark.checked = sources.bookmark;
    sourceHistory.checked = sources.history;
  }

  async function onSourceChange() {
    const sources = await loadSources();
    sources.bookmark = sourceBookmark.checked;
    sources.history = sourceHistory.checked;
    chrome.storage.local.set({ [SOURCES_KEY]: sources });
  }

  sourceBookmark.addEventListener('change', onSourceChange);
  sourceHistory.addEventListener('change', onSourceChange);

  // ---------- 设置弹窗：打开/关闭 ----------

  function openSettings(editEntry) {
    stopCapture();
    closeForm();
    refreshShortcutLabel();
    renderSources();
    renderSettingsList();
    settingsMask.hidden = false;
    if (editEntry) openForm(editEntry);
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

  // ---------- 快捷入口：卡片列表 + 内联表单 ----------

  // formEntry：undefined = 表单关闭；null = 新增；entry 对象 = 编辑该项
  let formEntry;

  // 设置弹窗内的快捷入口列表：新增/编辑/删除在此完成，保存后同步刷新外面宫格
  async function renderSettingsList() {
    const shortcuts = await loadShortcuts();
    settingsList.textContent = '';
    const entries = shortcuts.filter((s) => s && s.url);
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'nt-settings-empty';
      empty.textContent = '暂无快捷方式';
      settingsList.appendChild(empty);
      return;
    }
    for (const entry of entries) {
      settingsList.appendChild(buildSettingsItem(entry));
    }
  }

  function buildSettingsItem(entry) {
    const row = document.createElement('div');
    row.className = 'nt-settings-item';

    const icon = document.createElement('div');
    icon.className = 'nt-settings-item-icon';
    const img = document.createElement('img');
    img.alt = '';
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
    edit.textContent = '编辑';
    edit.addEventListener('click', () => openForm(entry, row));
    row.appendChild(edit);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'nt-settings-item-action';
    remove.textContent = '删除';
    remove.addEventListener('click', async () => {
      if (formEntry && formEntry.url === entry.url) closeForm();
      const shortcuts = await loadShortcuts();
      await saveShortcuts(shortcuts.filter((s) => s.url !== entry.url));
      renderSettingsList();
      renderGrid();
    });
    row.appendChild(remove);

    return row;
  }

  // 内联表单：编辑时插入到对应卡片之后，新增时追加到列表末尾
  function openForm(entry, afterRow) {
    formEntry = entry || null;
    settingsFormOk.textContent = formEntry ? '保存' : '添加';
    settingsFormUrl.value = formEntry ? formEntry.url : '';
    settingsFormTitle.value = formEntry ? formEntry.title || '' : '';
    settingsForm.hidden = false;
    settingsAdd.hidden = true;
    if (afterRow) settingsList.insertBefore(settingsForm, afterRow.nextSibling);
    else settingsList.appendChild(settingsForm);
    settingsFormUrl.focus();
  }

  function closeForm() {
    formEntry = undefined;
    settingsForm.hidden = true;
    settingsAdd.hidden = false;
  }

  settingsAdd.addEventListener('click', () => openForm(null));
  settingsFormCancel.addEventListener('click', closeForm);

  async function submitForm() {
    const rawUrl = settingsFormUrl.value.trim();
    if (!rawUrl) {
      settingsFormUrl.focus();
      return;
    }
    const url = normalizeUrl(rawUrl);
    try {
      new URL(url);
    } catch (_) {
      settingsFormUrl.focus();
      return;
    }
    const title = settingsFormTitle.value.trim() || hostOf(url);
    const shortcuts = await loadShortcuts();
    if (formEntry) {
      const index = shortcuts.findIndex((s) => s.url === formEntry.url);
      const next = shortcuts.filter((s, i) => i === index || s.url !== url);
      if (index >= 0) next[index] = { title, url };
      else next.push({ title, url });
      await saveShortcuts(next);
    } else {
      await saveShortcuts([
        ...shortcuts.filter((s) => s.url !== url),
        { title, url }
      ]);
    }
    closeForm();
    renderSettingsList();
    renderGrid();
  }

  settingsFormOk.addEventListener('click', submitForm);
  [settingsFormUrl, settingsFormTitle].forEach((el) => {
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
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

  function showContextMenu(x, y, entry) {
    menuEntry = entry;
    contextMenu.textContent = '';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = '编辑';
    edit.addEventListener('click', () => {
      hideContextMenu();
      openSettings(entry);
    });
    contextMenu.appendChild(edit);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '删除';
    remove.addEventListener('click', async () => {
      hideContextMenu();
      const shortcuts = await loadShortcuts();
      await saveShortcuts(shortcuts.filter((s) => s.url !== entry.url));
      renderGrid();
      renderSettingsList();
    });
    contextMenu.appendChild(remove);

    const openNew = document.createElement('button');
    openNew.type = 'button';
    openNew.textContent = '在新标签页打开';
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
      hideContextMenu();
      if (formEntry !== undefined) {
        closeForm();
        return;
      }
      closeSettings();
    }
  });
  window.addEventListener('blur', hideContextMenu);

  renderGrid();
  input.focus();
})();
