(function (root) {
  'use strict';

  const MAX_BYTES = 10 * 1024 * 1024;

  function normalize(url) {
    if (typeof url !== 'string' || !url.trim()) return null;
    try {
      const parsed = new URL(url.trim());
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
    } catch (_) {
      return null;
    }
  }

  function parse(text, name, parseHTML) {
    text = text.replace(/^\uFEFF/, '').trim();
    const entries = [];
    let invalid = 0;
    function add(title, rawUrl) {
      const url = normalize(rawUrl);
      if (!url) { invalid++; return; }
      entries.push({ title: typeof title === 'string' && title.trim() ? title.trim() : new URL(url).hostname, url });
    }
    if (/\.(itabdata|json)$/i.test(name) || text.startsWith('{')) {
      let data;
      try { data = JSON.parse(text); } catch (_) { throw new Error('import.malformed'); }
      if (!data || !Array.isArray(data.navConfig)) throw new Error('import.unsupported');
      // Traverse only the official navigation tree; never extract arbitrary URLs from settings.
      const stack = data.navConfig.slice().reverse();
      while (stack.length) {
        const node = stack.pop();
        if (!node || typeof node !== 'object') { invalid++; continue; }
        if (node.component || node.type === 'component') continue;
        if (Array.isArray(node.children)) {
          for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
        } else if (node.type !== 'folder') {
          add(node.name, node.url);
        }
      }
    } else if (/\.html?$/i.test(name) || /^<!DOCTYPE NETSCAPE-Bookmark-file-1/i.test(text)) {
      const doc = parseHTML(text);
      // Require the Netscape bookmark structure rather than accepting arbitrary web pages.
      if (!doc.querySelector('dl')) throw new Error('import.unsupported');
      for (const anchor of doc.querySelectorAll('dl a')) add(anchor.textContent, anchor.getAttribute('href'));
    } else {
      throw new Error('import.unsupported');
    }
    return { entries, invalid };
  }

  function merge(existing, parsed) {
    const seen = new Set(existing.map((entry) => normalize(entry && entry.url)).filter(Boolean));
    const additions = [];
    let duplicates = 0;
    for (const entry of parsed.entries) {
      if (seen.has(entry.url)) { duplicates++; continue; }
      seen.add(entry.url);
      additions.push(entry);
    }
    return { shortcuts: existing.concat(additions), additions, duplicates, invalid: parsed.invalid };
  }

  root.SpotlightShortcutImport = { MAX_BYTES, normalize, parse, merge };
})(globalThis);
