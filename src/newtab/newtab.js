(function () {
  'use strict';

  const SHORTCUTS_KEY = 'pinnedShortcuts';

  const input = document.getElementById('nt-input');
  const resultsEl = document.getElementById('nt-results');
  const grid = document.getElementById('nt-grid');
  const contextMenu = document.getElementById('nt-context-menu');
  const modalMask = document.getElementById('nt-modal-mask');
  const modalUrl = document.getElementById('nt-modal-url');
  const modalTitle = document.getElementById('nt-modal-title');
  const modalOk = document.getElementById('nt-modal-ok');
  const modalCancel = document.getElementById('nt-modal-cancel');
  const editFab = document.getElementById('nt-edit-fab');

  let searchSeq = 0;
  let debounceTimer = null;
  let composing = false;
  let editing = false;

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
    chrome.runtime.sendMessage({ type: 'search', query }, (response) => {
      if (chrome.runtime.lastError) return;
      if (seq !== searchSeq) return;
      panel.render(response?.groups, query);
    });
  }

  input.addEventListener('input', () => {
    const query = input.value.trim();
    clearTimeout(debounceTimer);
    if (!query) {
      searchSeq++;
      panel.clear();
      return;
    }
    debounceTimer = setTimeout(() => sendSearch(query), 200);
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

  async function renderGrid() {
    const shortcuts = await loadShortcuts();
    grid.textContent = '';
    for (const entry of shortcuts) {
      if (!entry || !entry.url) continue;
      grid.appendChild(buildTile({
        title: entry.title || hostOf(entry.url),
        url: entry.url
      }));
    }
    if (editing) grid.appendChild(buildAddTile());
  }

  function setEditing(value) {
    editing = value;
    editFab.classList.toggle('is-active', editing);
    editFab.setAttribute('aria-pressed', String(editing));
    editFab.title = editing ? '完成编辑' : '编辑快捷方式';
    renderGrid();
  }

  editFab.addEventListener('click', () => setEditing(!editing));

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

  function buildAddTile() {
    const tile = document.createElement('div');
    tile.className = 'nt-tile nt-tile-add';
    const icon = document.createElement('div');
    icon.className = 'nt-tile-icon';
    icon.textContent = '+';
    tile.appendChild(icon);
    const title = document.createElement('div');
    title.className = 'nt-tile-title';
    title.textContent = '添加';
    tile.appendChild(title);
    tile.addEventListener('click', openModal);
    return tile;
  }

  // ---------- 右键菜单 ----------

  let menuEntry = null;

  function showContextMenu(x, y, entry) {
    menuEntry = entry;
    contextMenu.textContent = '';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '删除';
    remove.addEventListener('click', async () => {
      hideContextMenu();
      const shortcuts = await loadShortcuts();
      await saveShortcuts(shortcuts.filter((s) => s.url !== entry.url));
      renderGrid();
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
      if (editing) setEditing(false);
    }
  });
  window.addEventListener('blur', hideContextMenu);

  // ---------- 添加弹窗 ----------

  function openModal() {
    modalUrl.value = '';
    modalTitle.value = '';
    modalMask.hidden = false;
    modalUrl.focus();
  }

  function closeModal() {
    modalMask.hidden = true;
  }

  modalCancel.addEventListener('click', closeModal);
  modalMask.addEventListener('mousedown', (event) => {
    if (event.target === modalMask) closeModal();
  });

  async function submitModal() {
    const rawUrl = modalUrl.value.trim();
    if (!rawUrl) return;
    const url = normalizeUrl(rawUrl);
    try {
      new URL(url);
    } catch (_) {
      modalUrl.focus();
      return;
    }
    const title = modalTitle.value.trim() || hostOf(url);
    const shortcuts = await loadShortcuts();
    await saveShortcuts([
      ...shortcuts.filter((s) => s.url !== url),
      { title, url }
    ]);
    closeModal();
    renderGrid();
  }

  modalOk.addEventListener('click', submitModal);
  [modalUrl, modalTitle].forEach((el) => {
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitModal();
      }
    });
  });

  renderGrid();
  input.focus();
})();
