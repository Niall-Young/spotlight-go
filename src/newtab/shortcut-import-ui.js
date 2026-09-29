(function () {
  'use strict';
  const importer = window.SpotlightShortcutImport;
  const i18n = window.SpotlightI18n;
  const dialog = document.getElementById('nt-import-dialog');
  const fileInput = document.getElementById('nt-import-file');
  const confirm = document.getElementById('nt-import-confirm');
  const cancel = document.getElementById('nt-import-cancel');
  const summary = document.getElementById('nt-import-summary');
  const preview = document.getElementById('nt-import-preview');
  const error = document.getElementById('nt-import-error');
  const status = document.getElementById('nt-import-status');
  let parsed = null;
  let result = null;
  let busy = false;
  let generation = 0;
  let errorKey = '';
  let savedCount = null;

  function storage(method, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local[method](value, (data) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(data);
      });
    });
  }

  async function readExisting() {
    const data = await storage('get', 'pinnedShortcuts');
    return Array.isArray(data.pinnedShortcuts) ? data.pinnedShortcuts : [];
  }

  function render() {
    error.hidden = !errorKey;
    error.textContent = errorKey ? i18n.t(errorKey) : '';
    summary.textContent = result ? i18n.t('import.summary', {
      added: result.additions.length, duplicates: result.duplicates, invalid: result.invalid
    }) : '';
    confirm.disabled = busy || !result || !result.additions.length;
    cancel.disabled = busy;
    fileInput.disabled = busy;
    confirm.textContent = i18n.t(busy ? 'import.saving' : 'import.confirm');
    status.hidden = savedCount === null;
    status.textContent = savedCount === null ? '' : i18n.t('import.success', { count: savedCount });
  }

  function showPreview() {
    preview.replaceChildren();
    if (!result) return;
    // Large backups must not create an unbounded number of DOM nodes.
    for (const entry of result.additions.slice(0, 100)) {
      const li = document.createElement('li');
      const title = document.createElement('strong');
      const url = document.createElement('span');
      title.textContent = entry.title;
      url.textContent = entry.url;
      li.append(title, url);
      preview.append(li);
    }
    if (result.additions.length > 100) {
      const li = document.createElement('li');
      li.textContent = i18n.t('import.previewLimit');
      preview.append(li);
    }
  }

  function openImport() {
    generation++;
    parsed = result = null;
    errorKey = '';
    savedCount = null;
    fileInput.value = '';
    preview.replaceChildren();
    render();
    dialog.showModal();
    fileInput.focus();
  }

  document.getElementById('nt-settings-import').addEventListener('click', openImport);

  const welcome = document.getElementById('nt-welcome-dialog');
  const welcomeImport = document.getElementById('nt-welcome-import');
  const welcomeSkip = document.getElementById('nt-welcome-skip');
  const welcomeError = document.getElementById('nt-welcome-error');
  let choosing = false;

  async function finishWelcome(importNow) {
    if (choosing) return;
    choosing = true;
    welcomeImport.disabled = welcomeSkip.disabled = true;
    welcomeError.hidden = true;
    try {
      await storage('set', { onboardingPending: false });
      welcome.close();
      if (importNow) openImport();
      else document.getElementById('nt-input').focus();
    } catch (_) {
      welcomeError.hidden = false;
    } finally {
      choosing = false;
      welcomeImport.disabled = welcomeSkip.disabled = false;
    }
  }

  welcomeImport.addEventListener('click', () => finishWelcome(true));
  welcomeSkip.addEventListener('click', () => finishWelcome(false));
  welcome.addEventListener('cancel', (event) => {
    event.preventDefault();
    finishWelcome(false);
  });
  storage('get', 'onboardingPending').then((data) => {
    if (data.onboardingPending === true) welcome.showModal();
  }).catch(() => { /* Leave the normal homepage usable if storage is unavailable. */ });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.onboardingPending?.newValue === false && welcome.open && !choosing) {
      welcome.close();
    }
  });

  fileInput.addEventListener('change', async () => {
    const current = ++generation;
    const file = fileInput.files[0];
    parsed = result = null;
    errorKey = '';
    showPreview();
    render();
    if (!file) return;
    if (file.size > importer.MAX_BYTES) { errorKey = 'import.tooLarge'; render(); return; }
    try {
      const text = await file.text();
      if (current !== generation) return;
      const next = importer.parse(text, file.name, (html) => {
        const template = document.createElement('template');
        template.innerHTML = html;
        return template.content;
      });
      const existing = await readExisting();
      if (current !== generation) return;
      parsed = next;
      result = importer.merge(existing, parsed);
      if (!parsed.entries.length) errorKey = 'import.empty';
    } catch (e) {
      if (current !== generation) return;
      errorKey = ['import.malformed', 'import.unsupported'].includes(e.message) ? e.message : 'import.readError';
    }
    showPreview();
    render();
  });

  confirm.addEventListener('click', async () => {
    if (busy || !parsed || !result || !result.additions.length) return;
    busy = true;
    errorKey = '';
    render();
    try {
      result = importer.merge(await readExisting(), parsed);
      if (result.additions.length) await storage('set', { pinnedShortcuts: result.shortcuts });
    } catch (_) {
      busy = false;
      errorKey = 'import.saveError';
      showPreview();
      render();
      return;
    }
    busy = false;
    savedCount = result.additions.length;
    render();
    dialog.close();
    window.dispatchEvent(new Event('spotlight:shortcuts-imported'));
  });

  cancel.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', (event) => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { generation++; });
  // Escape belongs to the import dialog, not the settings layer behind it.
  document.addEventListener('keydown', (event) => {
    if (dialog.open && event.key === 'Escape') {
      event.stopImmediatePropagation();
      if (busy) event.preventDefault();
    }
  }, true);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && i18n.STORAGE_KEY in changes) {
      queueMicrotask(() => { render(); showPreview(); });
    }
  });
})();
