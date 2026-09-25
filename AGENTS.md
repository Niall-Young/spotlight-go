# spotlight-go

Chrome 扩展（Manifest V3）：快捷键唤起的 Spotlight 风格聚焦搜索浮层 + 新标签页。功能与权限细节见 `README.md`。

## 技术边界

- 原生 JS / HTML / CSS，零构建步骤。不要引入打包器、框架或 npm 依赖；直接改源码即可生效。
- `src/shared/results-panel.*` 是 overlay 与新标签页复用的分组结果面板：改结果展示时改共享模块，不要在两处各自实现。
- `src/shared/i18n.js` 是 overlay 与新标签页共用的中英文案模块：所有界面文案在此按键维护，新增界面文本时加 key 并走 `data-i18n*` / `SpotlightI18n.t()`，不要在页面里硬编码。
- `src/overlay/` 以 closed Shadow DOM 注入任意页面（`matches: <all_urls>`），样式必须与宿主页面完全隔离，不得依赖或泄漏全局 CSS。
- 搜索聚合与打开结果都在 `src/background/service-worker.js` 中完成；页面侧只通过 `chrome.runtime` 消息通信。

## 工作流

- 每次代码改动完成后都必须过三个 gate：先按 `agents-gen` 技能检查并维护 `AGENTS.md`（无变化则报告 unchanged），再按 `good-readme` 技能检查并维护 `README.md`，最后按 `gitwork` 技能隔离提交任务改动。

## 验证

- 无测试与 lint 配置。验证方式：`chrome://extensions` 开启开发者模式后「加载已解压的扩展程序」，修改源码后点击扩展的刷新按钮重载。
- 手动回归三个入口：任意普通页面按 `Option+空格` 唤起浮层；`chrome://` 等不可注入页面应回退为打开新标签页；新标签页的搜索框与快捷方式。
