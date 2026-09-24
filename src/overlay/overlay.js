(function () {
  'use strict';

  let host = null;
  let shadow = null;
  let input = null;
  let panel = null;
  let searchSeq = 0;
  let debounceTimer = null;
  let composing = false;
  let cssPromise = null;

  function loadCss() {
    if (!cssPromise) {
      cssPromise = Promise.all([
        fetch(chrome.runtime.getURL('src/shared/results-panel.css')).then((r) => r.text()),
        fetch(chrome.runtime.getURL('src/overlay/overlay.css')).then((r) => r.text())
      ]).then((parts) => parts.join('\n'));
    }
    return cssPromise;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'show-overlay') {
      if (host) {
        input?.focus();
        input?.select();
      } else {
        openOverlay();
      }
    }
  });

  function sendSearch(query) {
    const seq = ++searchSeq;
    chrome.runtime.sendMessage({ type: 'search', query }, (response) => {
      if (chrome.runtime.lastError) return;
      if (seq !== searchSeq || !panel) return;
      panel.render(response?.groups, query);
      updateFooter(query);
    });
  }

  function updateFooter(query) {
    if (!shadow) return;
    const footer = shadow.querySelector('.sg-overlay-footer-text');
    if (!footer) return;
    footer.textContent = query
      ? panel.hasItems()
        ? '↑↓ 选择 · Enter 打开'
        : `Enter 搜索 “${query}”`
      : '输入以搜索标签页、书签、历史与网页';
  }

  function openDirectSearch(query) {
    chrome.runtime.sendMessage({
      type: 'open',
      item: { type: 'direct-search', query }
    });
  }

  function selectItem(item) {
    chrome.runtime.sendMessage({ type: 'open', item });
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
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      panel.moveSelection(1);
      updateFooter(input.value.trim());
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      panel.moveSelection(-1);
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
    } else if (event.key === 'Tab') {
      // 焦点锁在浮层内
      event.preventDefault();
    }
  }

  function onInput() {
    const query = input.value.trim();
    clearTimeout(debounceTimer);
    if (!query) {
      searchSeq++;
      panel.clear();
      updateFooter('');
      return;
    }
    debounceTimer = setTimeout(() => sendSearch(query), 200);
  }

  async function openOverlay() {
    const css = await loadCss();
    if (host) return;

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
    mask.addEventListener('mousedown', (event) => {
      if (event.target === mask) closeOverlay();
    });

    const box = document.createElement('div');
    box.className = 'sg-overlay-panel';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', '聚焦搜索');

    const header = document.createElement('div');
    header.className = 'sg-overlay-header';
    header.innerHTML =
      '<svg class="sg-overlay-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>';

    input = document.createElement('input');
    input.type = 'text';
    input.className = 'sg-overlay-input';
    input.placeholder = '搜索标签页、书签、历史与网页…';
    input.setAttribute('aria-label', '聚焦搜索');
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', handleKeydown);
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
    esc.textContent = 'Esc 关闭';
    footer.appendChild(esc);

    box.appendChild(header);
    box.appendChild(results);
    box.appendChild(footer);
    mask.appendChild(box);
    shadow.appendChild(mask);

    document.documentElement.appendChild(host);

    panel = window.SpotlightResults.create(results, { onSelect: selectItem });

    // 阻止按键泄漏到宿主页面
    host.addEventListener('keydown', (event) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(event.key)) {
        event.stopPropagation();
      }
    });

    updateFooter('');
    requestAnimationFrame(() => input.focus());
  }

  function closeOverlay() {
    clearTimeout(debounceTimer);
    searchSeq++;
    if (host) {
      host.remove();
      host = null;
      shadow = null;
      input = null;
      panel = null;
    }
  }

  window.addEventListener('pagehide', closeOverlay);
})();
