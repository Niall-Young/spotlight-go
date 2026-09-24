importScripts('search-rank.js');

const LIMIT_PER_GROUP = 5;
const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const HISTORY_MAX_CANDIDATES = 50;
const SUGGESTION_TIMEOUT_MS = 900;
const SUGGESTION_PREFETCH_TTL_MS = 1500;
const STATS_KEY = 'selectionStats';
const STATS_MAX_QUERIES = 80;
const STATS_MAX_URLS_PER_QUERY = 12;
const STATS_TTL_MS = 45 * 24 * 60 * 60 * 1000;
const SOURCES_KEY = 'searchSources';
const DEFAULT_SOURCES = { bookmark: true, history: true };

const Rank = self.SpotlightRank;

chrome.commands.onCommand.addListener((command) => {
  if (command === 'show-search') showOverlay();
});

chrome.action.onClicked.addListener(() => showOverlay());

const OVERLAY_SCRIPTS = ['src/shared/results-panel.js', 'src/overlay/overlay.js'];

async function showOverlay() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id != null) {
    if (await tryShowOverlay(tab.id)) return;
    // content script 可能未注入（扩展重载前已打开的页面），按需补注入后重试
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: OVERLAY_SCRIPTS
      });
      if (await tryShowOverlay(tab.id)) return;
    } catch (_) {
      // 页面无法注入 content script（chrome:// 等），回退到打开新标签页
    }
  }
  chrome.tabs.create({});
}

async function tryShowOverlay(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'show-overlay' });
    return true;
  } catch (_) {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'get-commands') {
    chrome.commands.getAll().then(sendResponse);
    return true;
  }
  if (message?.type === 'search') {
    localSearch(message.query || '').then(sendResponse);
    return true;
  }
  if (message?.type === 'search-suggestions') {
    consumeSuggestions(message.query || '').then(sendResponse);
    return true;
  }
  if (message?.type === 'open') {
    openItem(message.item, message.query).then(sendResponse);
    return true;
  }
  if (message?.type === 'record-selection') {
    recordSelection(message.query || '', message.url || '').then(sendResponse);
    return true;
  }
  return false;
});

// ---------- 搜索建议预取 ----------

const suggestionRequests = new Map();

function scheduleSuggestionPrefetch(query) {
  const now = Date.now();
  for (const [key, entry] of suggestionRequests) {
    if (now - entry.at > SUGGESTION_PREFETCH_TTL_MS) suggestionRequests.delete(key);
  }
  if (!suggestionRequests.has(query)) {
    suggestionRequests.set(query, {
      at: now,
      promise: fetchSuggestions(query).catch(() => [])
    });
  }
}

async function consumeSuggestions(query) {
  const q = query.trim();
  if (!q) return { groups: { suggestion: [] } };
  const entry = suggestionRequests.get(q);
  suggestionRequests.delete(q);
  const suggestion = entry
    ? await entry.promise
    : await fetchSuggestions(q).catch(() => []);
  return { groups: { suggestion } };
}

// ---------- 本地搜索（打分 + 去重） ----------

// 搜索来源开关（设置弹窗可关书签/历史）；缓存结果，storage 变更即失效
let searchSourcesCache = null;

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[SOURCES_KEY]) searchSourcesCache = null;
});

async function loadSearchSources() {
  if (searchSourcesCache) return searchSourcesCache;
  const data = await chrome.storage.local.get(SOURCES_KEY);
  const stored = data[SOURCES_KEY];
  searchSourcesCache = {
    ...DEFAULT_SOURCES,
    ...(stored && typeof stored === 'object' ? stored : {})
  };
  return searchSourcesCache;
}

async function localSearch(query) {
  const q = query.trim();
  if (!q) return { groups: { tab: [], bookmark: [], history: [] } };

  scheduleSuggestionPrefetch(q);

  const stats = await loadSelectionStats();
  const sources = await loadSearchSources();
  const [tab, bookmark, history] = await Promise.all([
    searchTabs(q, stats),
    sources.bookmark ? searchBookmarks(q, stats) : [],
    sources.history ? searchHistory(q, stats) : []
  ]);

  // 跨组去重：tab > bookmark > history
  const seen = new Set();
  for (const list of [tab, bookmark, history]) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].url) continue;
      const key = Rank.normalizeUrlKey(list[i].url);
      if (seen.has(key)) list.splice(i, 1);
      else seen.add(key);
    }
  }

  return { groups: { tab, bookmark, history } };
}

function selectionEntryFor(stats, query, url) {
  const perQuery = stats[query.toLowerCase()];
  if (!perQuery) return null;
  return perQuery[Rank.normalizeUrlKey(url)] || null;
}

async function searchTabs(q, stats) {
  const now = Date.now();
  const tabs = await chrome.tabs.query({});
  return tabs
    .map((t) => {
      const text = Rank.scoreTextMatch(t.title || '', t.url || '', q);
      if (text <= 0) return null;
      const score =
        text +
        Rank.SOURCE_WEIGHT.tab +
        Rank.selectionBoost(selectionEntryFor(stats, q, t.url), now);
      return {
        group: 'tab',
        title: t.title || t.url || '',
        url: t.url || '',
        tabId: t.id,
        windowId: t.windowId,
        score
      };
    })
    .filter(Boolean)
    .sort(Rank.compareItems)
    .slice(0, LIMIT_PER_GROUP);
}

async function searchBookmarks(q, stats) {
  const now = Date.now();
  const results = await chrome.bookmarks.search(q);
  return results
    .filter((b) => b.url)
    .map((b) => {
      const text = Rank.scoreTextMatch(b.title || '', b.url, q);
      if (text <= 0) return null;
      const score =
        text +
        Rank.SOURCE_WEIGHT.bookmark +
        Rank.selectionBoost(selectionEntryFor(stats, q, b.url), now);
      return { group: 'bookmark', title: b.title || b.url, url: b.url, score };
    })
    .filter(Boolean)
    .sort(Rank.compareItems)
    .slice(0, LIMIT_PER_GROUP);
}

async function searchHistory(q, stats) {
  const now = Date.now();
  const results = await chrome.history.search({
    text: q,
    startTime: now - HISTORY_WINDOW_MS,
    maxResults: HISTORY_MAX_CANDIDATES
  });
  return results
    .filter((h) => h.url)
    .map((h) => {
      const text = Rank.scoreTextMatch(h.title || '', h.url, q);
      if (text <= 0) return null;
      const score =
        text +
        Rank.SOURCE_WEIGHT.history +
        Rank.behaviorScore(h, now) +
        Rank.selectionBoost(selectionEntryFor(stats, q, h.url), now);
      return {
        group: 'history',
        title: h.title || h.url,
        url: h.url,
        lastVisitTime: h.lastVisitTime || 0,
        score
      };
    })
    .filter(Boolean)
    .sort(Rank.compareItems)
    .slice(0, LIMIT_PER_GROUP);
}

// ---------- 搜索建议（网络） ----------

async function fetchSuggestions(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUGGESTION_TIMEOUT_MS);
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

// ---------- 选择统计（影响后续排序） ----------

let selectionStatsPromise = null;

function loadSelectionStats() {
  if (!selectionStatsPromise) {
    selectionStatsPromise = chrome.storage.local
      .get(STATS_KEY)
      .then((data) =>
        data[STATS_KEY] && typeof data[STATS_KEY] === 'object'
          ? data[STATS_KEY]
          : {}
      );
  }
  return selectionStatsPromise;
}

function pruneStats(stats, now) {
  for (const [query, perQuery] of Object.entries(stats)) {
    const entries = Object.entries(perQuery).filter(
      ([, e]) => now - (e.lastSelectedAt || 0) < STATS_TTL_MS
    );
    entries.sort((a, b) => (b[1].lastSelectedAt || 0) - (a[1].lastSelectedAt || 0));
    if (entries.length === 0) delete stats[query];
    else stats[query] = Object.fromEntries(entries.slice(0, STATS_MAX_URLS_PER_QUERY));
  }
  const queries = Object.keys(stats);
  if (queries.length > STATS_MAX_QUERIES) {
    queries
      .map((q) => [
        q,
        Math.max(
          ...Object.values(stats[q]).map((e) => e.lastSelectedAt || 0)
        )
      ])
      .sort((a, b) => b[1] - a[1])
      .slice(STATS_MAX_QUERIES)
      .forEach(([q]) => delete stats[q]);
  }
}

async function recordSelection(query, url) {
  const q = query.trim().toLowerCase();
  if (!q || !url) return { ok: false };
  const stats = await loadSelectionStats();
  const key = Rank.normalizeUrlKey(url);
  const perQuery = stats[q] || (stats[q] = {});
  const entry = perQuery[key] || { count: 0, lastSelectedAt: 0 };
  entry.count = Math.min(999, entry.count + 1);
  entry.lastSelectedAt = Date.now();
  perQuery[key] = entry;
  pruneStats(stats, entry.lastSelectedAt);
  await chrome.storage.local.set({ [STATS_KEY]: stats });
  return { ok: true };
}

// ---------- 打开结果 ----------

async function openItem(item, query) {
  if (!item) return { ok: false };
  if (item.group === 'tab' && item.tabId != null) {
    await chrome.tabs.update(item.tabId, { active: true });
    if (item.windowId != null) {
      await chrome.windows.update(item.windowId, { focused: true });
    }
    if (item.url) await recordSelection(query || '', item.url);
    return { ok: true };
  }
  if (item.group === 'suggestion' || item.type === 'direct-search') {
    await chrome.search.query({ text: item.query || item.title || '', disposition: 'NEW_TAB' });
    return { ok: true };
  }
  if (item.url) {
    await chrome.tabs.create({ url: item.url, active: true });
    await recordSelection(query || '', item.url);
    return { ok: true };
  }
  return { ok: false };
}
