(function () {
  'use strict';

  // languageMode：zh / en；缺省或旧版 system 值按浏览器语言解析，非中文一律英文；
  // overlay 与新标签页共用，storage 变更后通过 init 回调即时切换
  const STORAGE_KEY = 'languageMode';

  const MESSAGES = {
    zh: {
      'welcome.brand': 'Spotlight Go',
      'welcome.title': '从你熟悉的网站开始',
      'welcome.help': '导入 iTab 备份或浏览器书签，把常用网站带到新首页。也可以自己设置，慢慢添加。',
      'welcome.import': '导入我的网站',
      'welcome.skip': '自己设置',
      'welcome.note': '以后随时可以在「设置 → 快速入口」中导入。',
      'welcome.saveError': '保存选择失败，请重试。',

      "import.open": "导入",
      "import.title": "导入快速入口",
      "import.help": "支持 iTab 备份（.itabdata / .json）和浏览器 HTML 书签，最大 10 MB。iTab 请在「设置 → 备份与恢复」导出并勾选「图标」。仅导入网站，文件夹会展开；文件只在本机处理。",
      "import.file": "选择备份或书签文件",
      "import.preview": "待导入的网站",
      "import.summary": "新增 {added} 个 · 重复 {duplicates} 个 · 无效 {invalid} 个",
      "import.confirm": "确认导入",
      "import.saving": "正在保存…",
      "import.success": "已导入 {count} 个快速入口",
      "import.malformed": "文件内容损坏，无法读取。请重新导出备份。",
      "import.unsupported": "暂不支持此文件结构。请选择包含图标的 iTab 备份或浏览器 HTML 书签文件。",
      "import.empty": "未找到可导入的网站，仅支持 HTTP 和 HTTPS 网址。",
      "import.tooLarge": "文件超过 10 MB，请减少导出内容后重试。",
      "import.readError": "读取文件或现有入口失败，请重试。",
      "import.saveError": "保存失败，尚未完成导入。请重试。",
      "import.previewLimit": "仅预览前 100 个网站，确认后导入全部新增网站。",

      'app.name': '聚焦搜索',
      'newtab.title': '新标签页',
      'newtab.searchPlaceholder': '搜索或输入网址…',
      'newtab.gridPrev': '上一页',
      'newtab.gridNext': '下一页',
      'settings.title': '设置',
      'settings.nav.general': '通用',
      'settings.nav.shortcuts': '快速入口',
      'settings.nav.appearance': '外观',
      'settings.theme.name': '主题',
      'settings.theme.desc': '新标签页与搜索浮层的亮暗外观',
      'settings.style.name': '样式',
      'settings.style.desc': '新标签页与搜索浮层的视觉风格',
      'settings.style.acrylic': '亚克力',
      'settings.style.neutral': '简约黑白',
      'settings.style.paper': '牛皮纸',
      'settings.style.pink': '少女粉',
      'settings.theme.system': '跟随浏览器',
      'settings.theme.light': '亮色',
      'settings.theme.dark': '暗色',
      'settings.language.name': '语言',
      'settings.language.desc': '新标签页与搜索浮层的界面语言',
      'settings.shortcut.name': '快捷键',
      'settings.shortcut.desc': '在普通页面唤起聚焦搜索',
      'settings.shortcut.change': '更改',
      'settings.shortcut.press': '按下新的快捷键…',
      'settings.shortcut.browserHint':
        '浏览器级快捷键 {shortcut} 会被 Chrome 直接拦截并触发唤起，无法在此录入；' +
        '可在 chrome://extensions/shortcuts 修改或移除该绑定。',
      'settings.shortcuts.name': '快速入口',
      'settings.shortcuts.desc': '展示在新标签页宫格中的常用网站',
      'settings.shortcuts.add': '+ 添加',
      'settings.shortcuts.formUrl': '网址，如 https://example.com',
      'settings.shortcuts.formTitle': '名称（可选）',
      'settings.shortcuts.empty': '暂无快捷方式',
      'settings.quickMode.name': '添加方式',
      'settings.quickMode.desc': '简洁保持原有首页；快速在宫格末尾显示加号',
      'settings.quickMode.simple': '简洁',
      'settings.quickMode.quick': '快速',
      'quickAdd.title': '添加快速入口',
      'quickAdd.url': '网址',
      'quickAdd.invalidUrl': '请输入有效的网址',
      'quickAdd.saveError': '保存失败，请重试',
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
      'welcome.brand': 'Spotlight Go',
      'welcome.title': 'Start with your favorite websites',
      'welcome.help': 'Bring your websites along with an iTab backup or browser bookmarks. Or start fresh and add them yourself.',
      'welcome.import': 'Import my websites',
      'welcome.skip': 'Set up myself',
      'welcome.note': 'You can always import later in Settings → Quick Links.',
      'welcome.saveError': 'Could not save your choice. Please try again.',

      "import.open": "Import",
      "import.title": "Import quick links",
      "import.help": "Choose an iTab backup (.itabdata / .json) or browser HTML bookmarks, up to 10 MB. In iTab, export from Settings → Backup and restore with Icons selected. Only websites are imported; folders are flattened. Files stay on this device.",
      "import.file": "Choose a backup or bookmark file",
      "import.preview": "Websites to import",
      "import.summary": "{added} new · {duplicates} duplicates · {invalid} invalid",
      "import.confirm": "Import links",
      "import.saving": "Saving…",
      "import.success": "Imported {count} quick links",
      "import.malformed": "This file is damaged. Please export a new backup.",
      "import.unsupported": "Unsupported structure. Choose an iTab backup containing icons or a browser HTML bookmark file.",
      "import.empty": "No websites to import. Only HTTP and HTTPS URLs are supported.",
      "import.tooLarge": "File exceeds 10 MB. Export fewer items and try again.",
      "import.readError": "Could not read the file or existing links. Please try again.",
      "import.saveError": "Could not save. Import is not complete; please try again.",
      "import.previewLimit": "Previewing the first 100 websites. All new websites will be imported.",

      'app.name': 'Spotlight Search',
      'newtab.title': 'New Tab',
      'newtab.searchPlaceholder': 'Search or enter a URL…',
      'newtab.gridPrev': 'Previous page',
      'newtab.gridNext': 'Next page',
      'settings.title': 'Settings',
      'settings.nav.general': 'General',
      'settings.nav.shortcuts': 'Quick Links',
      'settings.nav.appearance': 'Appearance',
      'settings.theme.name': 'Theme',
      'settings.theme.desc': 'Light or dark appearance of the new tab page and search overlay',
      'settings.style.name': 'Style',
      'settings.style.desc': 'Visual style of the new tab page and search overlay',
      'settings.style.acrylic': 'Acrylic',
      'settings.style.neutral': 'Neutral',
      'settings.style.paper': 'Paper',
      'settings.style.pink': 'Pink',
      'settings.theme.system': 'System',
      'settings.theme.light': 'Light',
      'settings.theme.dark': 'Dark',
      'settings.language.name': 'Language',
      'settings.language.desc': 'Language of the new tab page and search overlay',
      'settings.shortcut.name': 'Shortcut',
      'settings.shortcut.desc': 'Invoke Spotlight Search on regular pages',
      'settings.shortcut.change': 'Change',
      'settings.shortcut.press': 'Press a new shortcut…',
      'settings.shortcut.browserHint':
        'The browser-level shortcut {shortcut} is intercepted by Chrome and triggers the overlay, ' +
        'so it cannot be captured here; change or remove it at chrome://extensions/shortcuts.',
      'settings.shortcuts.name': 'Quick Links',
      'settings.shortcuts.desc': 'Frequently used sites shown in the new tab grid',
      'settings.shortcuts.add': '+ Add',
      'settings.shortcuts.formUrl': 'URL, e.g. https://example.com',
      'settings.shortcuts.formTitle': 'Name (optional)',
      'settings.shortcuts.empty': 'No shortcuts yet',
      'settings.quickMode.name': 'Adding shortcuts',
      'settings.quickMode.desc': 'Simple keeps the current layout; Quick adds a plus tile at the end',
      'settings.quickMode.simple': 'Simple',
      'settings.quickMode.quick': 'Quick',
      'quickAdd.title': 'Add quick link',
      'quickAdd.url': 'URL',
      'quickAdd.invalidUrl': 'Enter a valid URL',
      'quickAdd.saveError': 'Could not save. Please try again',
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
