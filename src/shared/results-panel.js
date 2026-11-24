(function () {
  'use strict';

  const GROUP_ORDER = ['direct', 'tab', 'bookmark', 'history', 'suggestion'];
  // 分组名与操作提示在渲染时按当前语言取值，语言切换后由 repaint 重绘；
  // 仅非默认操作（搜索建议、切换标签页）需要提示，打开类结果不显示提示
  const GROUP_META = {
    direct: { labelKey: 'group.direct' },
    suggestion: { labelKey: 'group.suggestion', hintKey: 'hint.suggestion' },
    tab: { labelKey: 'group.tab', hintKey: 'hint.tab' },
    bookmark: { labelKey: 'group.bookmark' },
    history: { labelKey: 'group.history' }
  };

  function t(key) {
    const i18n = typeof window !== 'undefined' ? window.SpotlightI18n : null;
    return i18n ? i18n.t(key) : key;
  }

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
    let lastGroups = {};
    let queryPending = false;
    let suggestionsPending = false;
    let localItemCount = 0;
    let suggestionGroupEl = null;
    // 缓存上一帧已解码的 favicon <img>，重绘时复用同一节点避免图标闪烁
    let activeIcons = new Map();

    function acquireFavicon(src, reusableIcons) {
      const pool = reusableIcons && reusableIcons.get(src);
      let img = pool && pool.length > 0 ? pool.pop() : null;
      if (!img) {
        img = document.createElement('img');
        img.alt = '';
        img.src = src;
      }
      let list = activeIcons.get(src);
      if (!list) {
        list = [];
        activeIcons.set(src, list);
      }
      list.push(img);
      return img;
    }

    function setSelected(index, scroll) {
      // 首尾需滚完分组和容器的留白，而不只是把结果行露出来。
      // 即使选中项没变，也允许再次导航回到真实边界。
      if (scroll && index === 0) container.scrollTop = 0;
      else if (scroll && index === items.length - 1) container.scrollTop = container.scrollHeight;
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
        if (scroll && index > 0 && index < items.length - 1) {
          node.scrollIntoView({ block: 'nearest' });
        }
      }
      if (opts.onSelectionChange) opts.onSelectionChange(getSelected());
    }

    function getSelected() {
      return !queryPending && selectedIndex >= 0 ? items[selectedIndex] || null : null;
    }

    function buildItem(item, index, query, reusableIcons) {
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
        icon.appendChild(acquireFavicon(faviconUrl(item.url || ''), reusableIcons));
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

      const hintKey = (GROUP_META[item.group] || {}).hintKey;
      if (hintKey) {
        const hint = document.createElement('div');
        hint.className = 'sg-item-hint';
        hint.textContent = t(hintKey);
        el.appendChild(hint);
      }

      el.addEventListener('mousemove', () => {
        if (!queryPending && index >= 0) setSelected(index, false);
      });
      el.addEventListener('click', () => {
        if (queryPending || index < 0) return;
        setSelected(index, false);
        if (opts.onSelect) opts.onSelect(item);
      });
      return el;
    }

    // 保留上一帧及当前视觉高亮，避免输入过程中选中态闪烁；
    // queryPending 期间 getSelected / 导航 / 点击均已拦截，不会误触旧结果
    function beginQuery(query) {
      const hadSelection = !queryPending && selectedIndex >= 0;
      queryPending = true;
      suggestionsPending = true;
      container.setAttribute('aria-busy', 'true');
      if (hadSelection && opts.onSelectionChange) opts.onSelectionChange(null);
    }

    function renderLocal(groups, query) {
      render(groups, query, true);
    }

    function render(groups, query, waitingForSuggestions) {
      const previousSuggestions = lastGroups.suggestion;
      queryPending = false;
      suggestionsPending = !!waitingForSuggestions;
      if (suggestionsPending) container.setAttribute('aria-busy', 'true');
      else container.removeAttribute('aria-busy');
      lastGroups = suggestionsPending && previousSuggestions
        ? { suggestion: previousSuggestions } : {};
      const src = groups || {};
      for (const group of GROUP_ORDER) {
        if (Array.isArray(src[group])) lastGroups[group] = src[group];
      }
      paint(query);
    }

    function buildGroup(group, list, query, reusableIcons) {
      const groupEl = document.createElement('div');
      groupEl.className = 'sg-group';
      const label = document.createElement('div');
      label.className = 'sg-group-title';
      const meta = GROUP_META[group] || {};
      label.textContent = meta.labelKey ? t(meta.labelKey) : group;
      groupEl.appendChild(label);
      for (const item of list) {
        const normalized = Object.assign({}, item, { group });
        const stale = suggestionsPending && group === 'suggestion';
        const index = stale ? -1 : items.length;
        if (!stale) items.push(normalized);
        const node = buildItem(normalized, index, query, reusableIcons);
        if (stale) node.setAttribute('aria-disabled', 'true');
        groupEl.appendChild(node);
      }
      return groupEl;
    }

    function mergeGroups(partial, query) {
      const src = partial || {};
      const keys = Object.keys(src);
      if (Array.isArray(src.suggestion)) {
        suggestionsPending = false;
        container.removeAttribute('aria-busy');
      }
      for (const group of keys) {
        if (Array.isArray(src[group])) lastGroups[group] = src[group];
      }
      // 网络建议晚于本地结果返回时，仅原地替换末尾的建议分组，
      // 不重建前面的本地分组 DOM，彻底避免本地结果的 favicon 重绘闪烁
      const onlySuggestion = keys.length > 0 && keys.every((group) => group === 'suggestion');
      if (
        onlySuggestion &&
        !queryPending &&
        currentQuery === (query || '') &&
        selectedIndex < localItemCount &&
        typeof container.removeChild === 'function'
      ) {
        if (suggestionGroupEl) {
          container.removeChild(suggestionGroupEl);
          suggestionGroupEl = null;
        }
        items.length = localItemCount;
        const list = lastGroups.suggestion;
        if (Array.isArray(list) && list.length > 0) {
          suggestionGroupEl = buildGroup('suggestion', list, currentQuery, null);
          container.appendChild(suggestionGroupEl);
        }
        if (selectedIndex === -1 && items.length > 0) {
          setSelected(0, false);
        }
        return;
      }
      paint(query);
    }

    function paint(query) {
      const previous = currentQuery === (query || '') ? getSelected() : null;
      const reusableIcons = activeIcons;
      activeIcons = new Map();
      currentQuery = query || '';
      items = [];
      selectedIndex = -1;
      localItemCount = 0;
      suggestionGroupEl = null;
      container.textContent = '';
      const src = lastGroups;
      for (const group of GROUP_ORDER) {
        const list = src[group];
        if (!Array.isArray(list) || list.length === 0) continue;
        if (group === 'suggestion') localItemCount = items.length;
        const groupEl = buildGroup(group, list, currentQuery, reusableIcons);
        if (group === 'suggestion') suggestionGroupEl = groupEl;
        container.appendChild(groupEl);
      }
      if (!suggestionGroupEl) localItemCount = items.length;
      if (items.length > 0) {
        const previousIndex = previous ? items.findIndex((item) =>
          item.group === previous.group && item.url === previous.url &&
          item.tabId === previous.tabId && item.query === previous.query
        ) : -1;
        setSelected(previousIndex >= 0 ? previousIndex : 0, false);
      } else if (suggestionsPending) {
        // 本地无匹配、仅保留上一帧网络建议等待新建议时，保持首行视觉高亮不闪灭；
        // selectedIndex 仍为 -1，不会误触发旧建议的回车或点击
        const firstNode = container.querySelectorAll('.sg-item')[0];
        if (firstNode) firstNode.classList.add('sg-selected');
      }
    }

    function moveSelection(delta) {
      if (queryPending || items.length === 0) return;
      const next = Math.max(0, Math.min(selectedIndex + delta, items.length - 1));
      setSelected(next, true);
    }

    function clear() {
      queryPending = false;
      suggestionsPending = false;
      container.removeAttribute('aria-busy');
      items = [];
      selectedIndex = -1;
      localItemCount = 0;
      suggestionGroupEl = null;
      activeIcons = new Map();
      currentQuery = '';
      lastGroups = {};
      container.textContent = '';
    }

    function hasItems() {
      return items.length > 0;
    }

    // 语言切换后按已有分组数据重绘，无需重新搜索
    function repaint() {
      paint(currentQuery);
    }

    return {
      render,
      beginQuery,
      renderLocal,
      mergeGroups,
      repaint,
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
