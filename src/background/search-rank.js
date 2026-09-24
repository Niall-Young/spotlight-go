(function () {
  'use strict';

  const TRACKING_PARAMS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'utm_id', 'ref', 'from', 'spm', 'si', 'fbclid', 'gclid', 'dclid',
    'mc_cid', 'mc_eid', 'igshid', '_ga'
  ]);

  const SOURCE_WEIGHT = { tab: 12, bookmark: 12, history: 4 };

  function normalizeUrlKey(url) {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase().replace(/^www\./, '');
      const port = u.port ? ':' + u.port : '';
      let path = u.pathname.replace(/\/+$/, '') || '/';
      const params = [...u.searchParams.entries()]
        .filter(([k]) => !TRACKING_PARAMS.has(k.toLowerCase()))
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      const query = params.length
        ? '?' + params.map(([k, v]) => k + '=' + v).join('&')
        : '';
      return u.protocol.toLowerCase() + '//' + host + port + path + query;
    } catch (_) {
      return String(url || '').toLowerCase();
    }
  }

  function splitWords(text) {
    return String(text || '')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
  }

  function scoreWords(words, terms, exactScore, prefixScore, containsScore) {
    let score = 0;
    for (const term of terms) {
      let best = 0;
      for (const word of words) {
        if (word === term) best = Math.max(best, exactScore);
        else if (word.startsWith(term)) best = Math.max(best, prefixScore);
        else if (word.includes(term)) best = Math.max(best, containsScore);
      }
      score += best;
    }
    return score;
  }

  // 返回 0 表示不相关，应淘汰
  function scoreTextMatch(title, url, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return 0;
    const terms = q.split(/\s+/).filter(Boolean);
    const t = String(title || '').toLowerCase();

    let score = 0;
    if (t) {
      if (t === q) score += 140;
      else if (t.startsWith(q)) score += 70;
      else if (splitWords(t).includes(q)) score += 45;
      score += scoreWords(splitWords(t), terms, 24, 14, 8);
    }

    let hostname = '';
    let path = '';
    try {
      const u = new URL(url);
      hostname = u.hostname.toLowerCase().replace(/^www\./, '');
      path = u.pathname.toLowerCase();
    } catch (_) {
      hostname = String(url || '').toLowerCase();
    }
    if (hostname) {
      const labels = hostname.split('.').filter(Boolean);
      if (labels.includes(q)) score += 42;
      else if (labels.some((l) => l.startsWith(q))) score += 16;
      else if (hostname.includes(q)) score += 10;
      score += scoreWords(labels, terms, 24, 14, 6);
    }
    if (path && path !== '/' && path.includes(q)) score += 10;

    return score;
  }

  function behaviorScore(stats, now) {
    const visitCount = stats.visitCount || 0;
    const typedCount = stats.typedCount || 0;
    const lastVisitTime = stats.lastVisitTime || 0;
    let score = 0;
    if (visitCount > 0) score += Math.min(18, Math.log2(visitCount + 1) * 4);
    if (typedCount > 0) score += Math.min(12, typedCount * 2);
    if (lastVisitTime > 0) {
      const age = now - lastVisitTime;
      if (age < 24 * 3600e3) score += 14;
      else if (age < 72 * 3600e3) score += 8;
      else if (age < 7 * 86400e3) score += 5;
      else if (age < 30 * 86400e3) score += 2;
    }
    return score;
  }

  function selectionBoost(entry, now) {
    if (!entry) return 0;
    const count = Math.min(999, entry.count || 0);
    if (count <= 0) return 0;
    let boost = Math.min(256, Math.log2(count + 1) * 64);
    const age = now - (entry.lastSelectedAt || 0);
    if (age < 86400e3) boost += 64;
    else if (age < 7 * 86400e3) boost += 44;
    else if (age < 30 * 86400e3) boost += 24;
    else boost += 10;
    return Math.min(320, boost);
  }

  function compareItems(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return (b.lastVisitTime || 0) - (a.lastVisitTime || 0);
  }

  const api = {
    SOURCE_WEIGHT,
    normalizeUrlKey,
    scoreTextMatch,
    behaviorScore,
    selectionBoost,
    compareItems
  };
  if (typeof self !== 'undefined') self.SpotlightRank = api;
  if (typeof globalThis !== 'undefined') globalThis.SpotlightRank = api;
})();
