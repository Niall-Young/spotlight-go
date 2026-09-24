# spotlight-go

Chrome 扩展（Manifest V3）：快捷键唤起的 Spotlight 风格聚焦搜索浮层 + 新标签页。功能与权限细节见 `README.md`。

## 技术边界

- 原生 JS / HTML / CSS，零构建步骤。不要引入打包器、框架或 npm 依赖；直接改源码即可生效。
- `src/shared/results-panel.*` 是 overlay 与新标签页复用的分组结果面板：改结果展示时改共享模块，不要在两处各自实现。
- `src/overlay/` 以 closed Shadow DOM 注入任意页面（`matches: <all_urls>`），样式必须与宿主页面完全隔离，不得依赖或泄漏全局 CSS。
- 搜索聚合与打开结果都在 `src/background/service-worker.js` 中完成；页面侧只通过 `chrome.runtime` 消息通信。

## 验证

- 无测试与 lint 配置。验证方式：`chrome://extensions` 开启开发者模式后「加载已解压的扩展程序」，修改源码后点击扩展的刷新按钮重载。
- 手动回归三个入口：任意普通页面按 `Cmd+Shift+K` 唤起浮层；`chrome://` 等不可注入页面应回退为打开新标签页；新标签页的搜索框与快捷方式。
