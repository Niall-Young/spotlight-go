const LIMIT_PER_GROUP = 5;
const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

chrome.commands.onCommand.addListener((command) => {
  if (command === 'show-search') showOverlay();
});

chrome.action.onClicked.addListener(() => showOverlay());

async function showOverlay() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id != null) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'show-overlay' });
      return;
    } catch (_) {
      // 页面无法注入 content script（chrome:// 等），回退到打开新标签页
    }
  }
  chrome.tabs.create({});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'search') {
    aggregateSearch(message.query || '').then(sendResponse);
    return true;
  }
  if (message?.type === 'open') {
    openItem(message.item).then(sendResponse);
    return true;
  }
  return false;
});

async function aggregateSearch(query) {
  const q = query.trim();
  if (!q) return { groups: { suggestion: [], tab: [], bookmark: [], history: [] } };

  const [suggestion, tab, bookmark, history] = await Promise.all([
    fetchSuggestions(q).catch(() => []),
    searchTabs(q),
    searchBookmarks(q),
    searchHistory(q)
  ]);
  return { groups: { suggestion, tab, bookmark, history } };
}

async function fetchSuggestions(query, timeoutMs = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let texts = [];
    try {
      const res = await fetch(
        `https://www.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      texts = Array.isArray(data?.[1]) ? data[1] : [];
    } catch (_) {
      const res = await fetch(
        `https://www.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      texts = Array.isArray(data?.[1]) ? data[1] : [];
    }
    return texts.slice(0, LIMIT_PER_GROUP).map((text) => ({
      group: 'suggestion',
      title: String(text),
      query: String(text)
    }));
  } finally {
    clearTimeout(timer);
  }
}

async function searchTabs(query) {
  const q = query.toLowerCase();
  const tabs = await chrome.tabs.query({});
  return tabs
    .filter(
      (t) =>
        t.title?.toLowerCase().includes(q) || t.url?.toLowerCase().includes(q)
    )
    .slice(0, LIMIT_PER_GROUP)
    .map((t) => ({
      group: 'tab',
      title: t.title || t.url || '',
      url: t.url || '',
      tabId: t.id,
      windowId: t.windowId
    }));
}

async function searchBookmarks(query) {
  const results = await chrome.bookmarks.search(query);
  return results
    .filter((b) => b.url)
    .slice(0, LIMIT_PER_GROUP)
    .map((b) => ({ group: 'bookmark', title: b.title || b.url, url: b.url }));
}

async function searchHistory(query) {
  const results = await chrome.history.search({
    text: query,
    startTime: Date.now() - HISTORY_WINDOW_MS,
    maxResults: LIMIT_PER_GROUP
  });
  return results
    .filter((h) => h.url)
    .slice(0, LIMIT_PER_GROUP)
    .map((h) => ({ group: 'history', title: h.title || h.url, url: h.url }));
}

async function openItem(item) {
  if (!item) return { ok: false };
  if (item.group === 'tab' && item.tabId != null) {
    await chrome.tabs.update(item.tabId, { active: true });
    if (item.windowId != null) {
      await chrome.windows.update(item.windowId, { focused: true });
    }
    return { ok: true };
  }
  if (item.group === 'suggestion' || item.type === 'direct-search') {
    await chrome.search.query({ text: item.query || item.title || '' });
    return { ok: true };
  }
  if (item.url) {
    await chrome.tabs.create({ url: item.url, active: true });
    return { ok: true };
  }
  return { ok: false };
}
