(function () {
  'use strict';

  // languageMode：system（默认，跟随浏览器语言）/ zh / en；
  // overlay 与新标签页共用，storage 变更后通过 init 回调即时切换
  const STORAGE_KEY = 'languageMode';

  const MESSAGES = {
    zh: {
      'app.name': '聚焦搜索',
      'newtab.title': '新标签页',
      'newtab.searchPlaceholder': '搜索或输入网址…',
      'newtab.gridPrev': '上一页',
      'newtab.gridNext': '下一页',
      'settings.title': '设置',
      'settings.nav.general': '通用',
      'settings.nav.shortcuts': '快捷入口',
      'settings.nav.sources': '搜索内容',
      'settings.theme.name': '主题',
      'settings.theme.desc': '新标签页与搜索浮层的外观',
      'settings.theme.system': '跟随浏览器',
      'settings.theme.light': '亮色',
      'settings.theme.dark': '暗色',
      'settings.language.name': '语言',
      'settings.language.desc': '新标签页与搜索浮层的界面语言',
      'settings.language.system': '跟随系统',
      'settings.shortcut.name': '快捷键',
      'settings.shortcut.desc': '在普通页面唤起聚焦搜索',
      'settings.shortcut.change': '更改',
      'settings.shortcut.press': '按下新的快捷键…',
      'settings.shortcut.browserHint':
        '浏览器级快捷键 {shortcut} 会被 Chrome 直接拦截并触发唤起，无法在此录入；' +
        '可在 chrome://extensions/shortcuts 修改或移除该绑定。',
      'settings.shortcuts.name': '快捷入口',
      'settings.shortcuts.desc': '展示在新标签页宫格中的常用网站',
      'settings.shortcuts.add': '+ 添加',
      'settings.shortcuts.formUrl': '网址，如 https://example.com',
      'settings.shortcuts.formTitle': '名称（可选）',
      'settings.shortcuts.empty': '暂无快捷方式',
      'settings.sources.name': '搜索内容',
      'settings.sources.desc': '选择聚焦搜索聚合的来源，网页搜索始终开启',
      'settings.sources.tab': '标签页',
      'settings.sources.bookmark': '书签',
      'settings.sources.history': '历史记录',
      'common.done': '完成',
      'common.cancel': '取消',
      'common.save': '保存',
      'common.add': '添加',
      'common.edit': '编辑',
      'common.delete': '删除',
      'common.openInNewTab': '在新标签页打开',
      'group.suggestion': '搜索建议',
      'group.tab': '标签页',
      'group.bookmark': '书签',
      'group.history': '历史',
      'hint.suggestion': '搜索',
      'hint.tab': '切换',
      'hint.open': '打开',
      'overlay.placeholder': '搜索标签页、书签、历史与网页…',
      'overlay.footerIdle': '输入以搜索标签页、书签、历史与网页',
      'overlay.footerSelect': 'Tab 选择 · Enter 打开',
      'overlay.footerSearch': 'Enter 搜索 “{query}”',
      'overlay.esc': 'Esc 关闭'
    },
    en: {
      'app.name': 'Spotlight Search',
      'newtab.title': 'New Tab',
      'newtab.searchPlaceholder': 'Search or enter a URL…',
      'newtab.gridPrev': 'Previous page',
      'newtab.gridNext': 'Next page',
      'settings.title': 'Settings',
      'settings.nav.general': 'General',
      'settings.nav.shortcuts': 'Shortcuts',
      'settings.nav.sources': 'Sources',
      'settings.theme.name': 'Theme',
      'settings.theme.desc': 'Appearance of the new tab page and search overlay',
      'settings.theme.system': 'System',
      'settings.theme.light': 'Light',
      'settings.theme.dark': 'Dark',
      'settings.language.name': 'Language',
      'settings.language.desc': 'Language of the new tab page and search overlay',
      'settings.language.system': 'System',
      'settings.shortcut.name': 'Shortcut',
      'settings.shortcut.desc': 'Invoke Spotlight Search on regular pages',
      'settings.shortcut.change': 'Change',
      'settings.shortcut.press': 'Press a new shortcut…',
      'settings.shortcut.browserHint':
        'The browser-level shortcut {shortcut} is intercepted by Chrome and triggers the overlay, ' +
        'so it cannot be captured here; change or remove it at chrome://extensions/shortcuts.',
      'settings.shortcuts.name': 'Shortcuts',
      'settings.shortcuts.desc': 'Frequently used sites shown in the new tab grid',
      'settings.shortcuts.add': '+ Add',
      'settings.shortcuts.formUrl': 'URL, e.g. https://example.com',
      'settings.shortcuts.formTitle': 'Name (optional)',
      'settings.shortcuts.empty': 'No shortcuts yet',
      'settings.sources.name': 'Search Sources',
      'settings.sources.desc': 'Sources aggregated by Spotlight Search; web search is always on',
      'settings.sources.tab': 'Tabs',
      'settings.sources.bookmark': 'Bookmarks',
      'settings.sources.history': 'History',
      'common.done': 'Done',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.add': 'Add',
      'common.edit': 'Edit',
      'common.delete': 'Delete',
      'common.openInNewTab': 'Open in new tab',
      'group.suggestion': 'Suggestions',
      'group.tab': 'Tabs',
      'group.bookmark': 'Bookmarks',
      'group.history': 'History',
      'hint.suggestion': 'Search',
      'hint.tab': 'Switch',
      'hint.open': 'Open',
      'overlay.placeholder': 'Search tabs, bookmarks, history and the web…',
      'overlay.footerIdle': 'Type to search tabs, bookmarks, history and the web',
      'overlay.footerSelect': 'Tab to select · Enter to open',
      'overlay.footerSearch': 'Enter to search “{query}”',
      'overlay.esc': 'Esc to close'
    }
  };

  let current = 'zh';

  function resolve(mode) {
    if (mode === 'zh' || mode === 'en') return mode;
    return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  function t(key, vars) {
    const table = MESSAGES[current] || MESSAGES.zh;
    let text = table[key] != null ? table[key] : MESSAGES.zh[key];
    if (text == null) return key;
    if (vars) {
      for (const name of Object.keys(vars)) {
        text = text.split('{' + name + '}').join(String(vars[name]));
      }
    }
    return text;
  }

  // 读取 storage 后回调一次当前语言，之后 languageMode 变更时再次回调
  function init(onLang) {
    const apply = (mode) => {
      const next = resolve(mode);
      if (next === current && init.done) return;
      current = next;
      init.done = true;
      if (onLang) onLang(current);
    };
    try {
      chrome.storage.local.get(STORAGE_KEY, (data) => {
        if (chrome.runtime.lastError) return;
        apply(data[STORAGE_KEY]);
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !(STORAGE_KEY in changes)) return;
        apply(changes[STORAGE_KEY].newValue);
      });
    } catch (_) {
      /* 忽略：扩展上下文失效，保持默认语言 */
    }
  }
  init.done = false;

  const api = {
    STORAGE_KEY,
    t,
    init,
    getLang() {
      return current;
    }
  };
  if (typeof window !== 'undefined') window.SpotlightI18n = api;
  if (typeof globalThis !== 'undefined') globalThis.SpotlightI18n = api;
})();
