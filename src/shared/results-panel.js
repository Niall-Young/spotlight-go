(function () {
  'use strict';

  const GROUP_ORDER = ['suggestion', 'tab', 'bookmark', 'history'];
  const GROUP_META = {
    suggestion: { label: '搜索建议', hint: '搜索' },
    tab: { label: '标签页', hint: '切换' },
    bookmark: { label: '书签', hint: '打开' },
    history: { label: '历史', hint: '打开' }
  };

  function faviconUrl(pageUrl) {
    return chrome.runtime.getURL(
      '/_favicon/?pageUrl=' + encodeURIComponent(pageUrl) + '&size=32'
    );
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname;
    } catch (_) {
      return url || '';
    }
  }

  function highlightParts(text, query) {
    const frag = document.createDocumentFragment();
    if (!query || !text) {
      frag.appendChild(document.createTextNode(text || ''));
      return frag;
    }
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let pos = 0;
    let idx = lowerText.indexOf(lowerQuery);
    while (idx !== -1) {
      if (idx > pos) frag.appendChild(document.createTextNode(text.slice(pos, idx)));
      const mark = document.createElement('mark');
      mark.textContent = text.slice(idx, idx + query.length);
      frag.appendChild(mark);
      pos = idx + query.length;
      idx = lowerText.indexOf(lowerQuery, pos);
    }
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    return frag;
  }

  function create(container, options) {
    const opts = options || {};
    let items = [];
    let selectedIndex = -1;
    let currentQuery = '';

    function setSelected(index, scroll) {
      if (index === selectedIndex) return;
      const nodes = container.querySelectorAll('.sg-item');
      if (nodes[selectedIndex]) {
        nodes[selectedIndex].classList.remove('sg-selected');
        nodes[selectedIndex].removeAttribute('aria-selected');
      }
      selectedIndex = index;
      const node = nodes[selectedIndex];
      if (node) {
        node.classList.add('sg-selected');
        node.setAttribute('aria-selected', 'true');
        if (scroll) node.scrollIntoView({ block: 'nearest' });
      }
      if (opts.onSelectionChange) opts.onSelectionChange(getSelected());
    }

    function getSelected() {
      return selectedIndex >= 0 ? items[selectedIndex] || null : null;
    }

    function buildItem(item, index, query) {
      const el = document.createElement('div');
      el.className = 'sg-item';
      el.setAttribute('role', 'option');
      el.dataset.index = String(index);

      const icon = document.createElement('div');
      icon.className = 'sg-item-icon';
      if (item.group === 'suggestion') {
        icon.innerHTML =
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>';
      } else {
        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.src = faviconUrl(item.url || '');
        icon.appendChild(img);
      }
      el.appendChild(icon);

      const text = document.createElement('div');
      text.className = 'sg-item-text';
      const title = document.createElement('div');
      title.className = 'sg-item-title';
      title.appendChild(highlightParts(item.title, query));
      text.appendChild(title);
      if (item.url) {
        const url = document.createElement('div');
        url.className = 'sg-item-url';
        url.textContent = hostOf(item.url);
        text.appendChild(url);
      }
      el.appendChild(text);

      const hint = document.createElement('div');
      hint.className = 'sg-item-hint';
      hint.textContent = (GROUP_META[item.group] || {}).hint || '';
      el.appendChild(hint);

      el.addEventListener('mousemove', () => setSelected(index, false));
      el.addEventListener('click', () => {
        setSelected(index, false);
        if (opts.onSelect) opts.onSelect(item);
      });
      return el;
    }

    function render(groups, query) {
      currentQuery = query || '';
      items = [];
      selectedIndex = -1;
      container.textContent = '';
      const src = groups || {};
      for (const group of GROUP_ORDER) {
        const list = src[group];
        if (!Array.isArray(list) || list.length === 0) continue;
        const groupEl = document.createElement('div');
        groupEl.className = 'sg-group';
        const label = document.createElement('div');
        label.className = 'sg-group-title';
        label.textContent = (GROUP_META[group] || {}).label || group;
        groupEl.appendChild(label);
        for (const item of list) {
          const normalized = Object.assign({}, item, { group });
          const index = items.length;
          items.push(normalized);
          groupEl.appendChild(buildItem(normalized, index, currentQuery));
        }
        container.appendChild(groupEl);
      }
      if (items.length > 0) setSelected(0, false);
    }

    function moveSelection(delta) {
      if (items.length === 0) return;
      const next = (selectedIndex + delta + items.length) % items.length;
      setSelected(next, true);
    }

    function clear() {
      items = [];
      selectedIndex = -1;
      currentQuery = '';
      container.textContent = '';
    }

    function hasItems() {
      return items.length > 0;
    }

    return {
      render,
      clear,
      hasItems,
      getSelected,
      moveSelection,
      getQuery() {
        return currentQuery;
      }
    };
  }

  const api = { create };
  if (typeof window !== 'undefined') window.SpotlightResults = api;
  if (typeof globalThis !== 'undefined') globalThis.SpotlightResults = api;
})();
