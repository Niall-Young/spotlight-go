<div align="center">

<img src="assets/icon-128.png" width="96" height="96" alt="Spotlight Go Logo" />

# Spotlight Go

**A lightning-fast, keyboard-driven Spotlight search overlay & minimalist frosted-glass new tab for Google Chrome.**

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-10b981.svg?style=flat-square&logo=googlechrome&logoColor=white)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Privacy: Zero Tracking](https://img.shields.io/badge/Privacy-Zero_Data_Collection-purple.svg?style=flat-square)](docs/PRIVACY.md)
[![Platform: Chromium](https://img.shields.io/badge/Platform-Chrome%20%7C%20Edge%20%7C%20Brave-informational.svg?style=flat-square)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/Niall-Young/spotlight-go/pulls)
[![GitHub Stars](https://img.shields.io/github/stars/Niall-Young/spotlight-go?style=flat-square&color=ffd700)](https://github.com/Niall-Young/spotlight-go/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/Niall-Young/spotlight-go?style=flat-square&color=orange)](https://github.com/Niall-Young/spotlight-go/issues)

<p align="center">
  <a href="#中文">中文</a> | <a href="#english">English</a>
</p>

<p align="center">
  <a href="#-why-spotlight-go">Why Spotlight Go?</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-keyboard-shortcuts">Shortcuts</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-permissions">Permissions</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="docs/PRIVACY.md">Privacy</a> •
  <a href="LICENSE">License</a>
</p>

</div>

<a id="english"></a>
## English

---

<a id="中文"></a>
## 中文

### 💡 设计初衷

在日常浏览器使用中，我们常常面临这些痛点：
* 打开了数十个标签页，想要切换回某个特定页面却要在标签栏反复翻找；
* 收藏的书签层级繁多，难以迅速触达；
* 想要查找几周前的浏览历史，需打断当前工作流进入繁重的历史记录页面；
* 市面上的新标签页扩展往往体积臃肿、充斥各类无用信息流或广告，甚至带来隐私风险。

**Spotlight Go** 将 macOS Spotlight、Alfred 与 Raycast 的流畅键盘操作范式完整带入 Chrome：
* **任意页面全局呼出**：在任意普通网页按下 `Option + 空格`（Mac）或 `Ctrl + Shift + K`（Windows / Linux），立刻在屏幕正中唤出聚焦搜索面板，无需离开当前页面上下文。
* **多源聚合，即打即现**：输入关键词，毫秒级聚合已打开的标签页、书签收藏、近 30 天历史记录以及实时搜索引擎建议。
* **极简磨砂质感新标签页**：黑白灰单色系与精细磨砂玻璃质感，配备浅蓝扫光居中搜索框与自适应快捷入口宫格。
* **原生纯粹，零外部依赖**：纯原生 JS / HTML / CSS，无打包器、无庞大第三方包、无任何服务器上传，100% 本地运行与隐私安全。

---

### ✨ 功能特性

#### 🔍 全局聚焦搜索浮层（Spotlight Overlay）
* **全页面随时唤起**：全局快捷键一键唤出（Mac: `Option + 空格`，Windows/Linux: `Ctrl + Shift + K`）。
* **四大数据源多维聚合**：
  * 📑 **打开的标签页**：回车即可秒级切换回已有标签，无需重复新建标签浪费系统内存。
  * ⭐️ **书签收藏**：基于标题与 URL 的极速检索。
  * 🕒 **浏览历史**：本地检索近 30 天的访问足迹。
  * 💡 **网页搜索建议**：实时拉取 Google 搜索建议（失败时无缝回退 Bing），异步追加至列表底部，体验丝滑流畅。
* **智能去重与分组优先级**：严格遵循 `标签页 > 书签 > 历史记录` 优先级，同一 URL 跨组去重，避免信息杂乱。
* **精准相关度排序算法**（`search-rank.js`）：
  * 标题与域名的精准匹配及前缀匹配享有最高权重；
  * 智能结合历史访问次数、最近访问时间以及用户过往选择行为动态打分；
  * 本地结果零延迟即时渲染，不阻塞等待网络响应。
* **按键即刻捕获**：唤起浮层时瞬间保存首个按键输入，杜绝输入法与快速敲击导致的丢字丢词。
* **不打断当前页面**：从浮层打开任何结果或发起网页搜索都会在新标签页中进行，当前页面始终保持原样（已有标签页仍直接切换）。
* **特权页面智能回退**：在 Chrome 限制页面（如 `chrome://extensions`）中触发时，自动回退打开新标签页并聚焦搜索框。

#### 🪟 极简磨砂质感新标签页（New Tab）
* **居中搜索卡片**：自动聚焦输入框，边缘搭载优雅细腻的浅蓝扫光微动效。
* **共用分组结果面板**：与浮层复用统一的高性能结果渲染组件，交互逻辑严谨一致。
* **自配置快捷方式宫格**：
  * 列数随浏览器视口宽度动态自适应，视觉平衡；
  * 最多展示两行，快捷方式超出时底部居中显示左右箭头按钮翻页；
  * 瓦片支持同页左右双向及跨行拖拽，实时预览落点并保存顺序；取消拖拽恢复原顺序，不支持跨页拖拽；
  * 自动解析并渲染站点高清 Favicon 图标。
* **两种添加方式**：在「设置 → 快速入口」选择「简洁」（默认，保留原有首页）或「快速」。快速模式在全部网站末尾增加加号卡片，点击打开独立弹窗填写网址和可选名称；支持 Enter 添加、Escape 取消。加号占一个宫格位置，满页时进入下一页，不参与排序；保存后定位到新增网站所在页，重复网址只保留一份。
* **轻量设置弹窗**：右下角悬浮按钮打开三段式设置面板——「通用」自定义浮层唤起快捷键（点击「更改」后按下组合键）、选择搜索来源（标签页 / 书签 / 历史记录）与界面语言（中文 / English）；「快速入口」以卡片列表内联新增、编辑、删除；「外观」选择主题（跟随系统 / 亮色 / 暗色）与四种视觉样式（亚克力 / 简约黑白 / 牛皮纸 / 少女粉），样式同时作用于新标签页与搜索浮层。
* **中英双语界面**：新标签页与搜索浮层完整支持中文 / English，默认按浏览器语言显示（非中文一律英文），也可在设置「通用」中手动切换。
* **右键快捷菜单**：右键点击瓦片支持直接修改网址与名称、删除快捷方式或在新标签页打开。

#### 🎨 视觉美学与技术边界
* **磨砂玻璃与明暗自适应**：沉浸式 `backdrop-filter` 磨砂模糊，随系统深色/浅色模式实时切换，并提供亚克力（默认）/ 简约黑白 / 牛皮纸 / 少女粉四种视觉样式，克制优雅。
* **闭合式 Shadow DOM 样式隔离**：浮层以 `closed Shadow DOM` 注入宿主页面，彻底隔绝页面间 CSS 样式污染，保证在任何复杂的网页上均呈现一致外观。
* **零构建与零依赖**：100% 原生现代化 Web 标准技术，代码简洁直观，修改源码即可秒级生效。

---

### ⌨️ 快捷键一览

| 快捷键 | 作用场景 | 说明 |
| :--- | :--- | :--- |
| `Option + 空格` *(Mac)*<br>`Ctrl + Shift + K` *(Win/Linux)* | 任意网页 | 唤起 / 关闭聚焦搜索浮层 |
| `Tab` / `Shift + Tab` | 搜索浮层 | 向下 / 向上移动选中项 |
| `↑` / `↓` | 新标签页 | 跨类别平滑导航搜索结果 |
| `Enter` | 搜索浮层 / 新标签页 | 打开选中项 / 切换标签页 / 网址直达 / 执行网页搜索 |
| `Esc` | 搜索浮层 | 关闭浮层 |
| *右键点击瓦片* | 新标签页 | 呼出快捷方式管理菜单（编辑 / 删除 / 新标签页打开） |

> [!TIP]
> 在设置弹窗中点击「更改」，按下新的组合键并保存即可生效（Chrome 不允许扩展程序化改键，自定义绑定由扩展在页面内监听实现）；浏览器级默认快捷键仍由 Chrome 保留，可在 `chrome://extensions/shortcuts` 查看管理，并在 `chrome://` 等不可注入页面继续作为回退唤起方式。注意：浏览器级快捷键本身会被 Chrome 在浏览器层拦截，页面收不到按键事件，无法录入到捕获框中（录入期间该按键会被暂时忽略，不会触发唤起）。注意：浏览器级快捷键本身会被 Chrome 在浏览器层拦截，页面收不到按键事件，无法录入到捕获框中（录入期间该按键会被暂时忽略，不会触发唤起）。

---

### ⚡ 安装与使用

#### 开发者模式手动安装

1. **克隆本仓库到本地**：
   ```bash
   git clone https://github.com/Niall-Young/spotlight-go.git
   ```
2. **进入扩展管理页**：
   在 Chrome 浏览器中访问 `chrome://extensions`（同样兼容 Edge、Brave 等 Chromium 浏览器）。
3. **开启开发者模式**：
   打开右上角的 **「开发者模式」** 开关。
4. **加载已解压的扩展程序**：
   点击左上角的 **「加载已解压的扩展程序」**，在文件选择框中选中刚才克隆的 `spotlight-go` 项目根目录。
5. **体验 Spotlight 聚焦搜索**：
   * 打开浏览器新标签页，即可看到沉浸式极简主页；
   * 打开任意普通网页，按下 `Option + 空格`（Mac）或 `Ctrl + Shift + K`（Windows/Linux）唤起搜索浮层！

---

### 🔒 权限说明

本项目严格遵循最小必要权限原则，各项权限的用途如下：

| 权限声明 | 用途解释 |
| :--- | :--- |
| `storage` | 保存用户自定义的快捷方式列表、浮层唤起快捷键、搜索来源开关及搜索选择频次统计（保存在 `chrome.storage.local`）。 |
| `tabs` | 检索已打开的标签页并在选中时直接切换。 |
| `bookmarks` | 本地检索用户的书签收藏夹。 |
| `history` | 本地检索近 30 天的历史访问记录。 |
| `search` | 未选择具体条目时，调用浏览器默认搜索引擎发起搜索。 |
| `favicon` | 为搜索结果和快捷瓦片渲染高清晰度站点图标。 |
| `scripting` & `<all_urls>` | 当按下快捷键时，向扩展重载前已打开的存量网页按需注入浮层脚本。 |
| `https://www.google.com/complete/*`<br>`https://*.bing.com/osjson.aspx*` | 直接向 Google（失败时回退 Bing）请求搜索关键词联想建议。 |

> [!NOTE]
> Spotlight Go **不收集、不存储、不上传** 任何用户数据，所有索引与排序逻辑全部在本地运行。详细说明请查阅 [隐私政策](docs/PRIVACY.md)。

---

### 📂 项目架构

```text
spotlight-go/
├── docs/                      # 仓库治理与政策文档
│   └── PRIVACY.md             # 隐私政策（零数据收集，全本地运行）
├── assets/                    # 运行时资源：扩展图标 + 样式预览缩略图
├── src/
│   ├── background/            # Manifest V3 后台服务（Service Worker）
│   │   ├── service-worker.js  # 快捷键监听、多源搜索聚合调度、标签页切换
│   │   └── search-rank.js     # 智能多维打分与相关度排序算法
│   ├── overlay/               # 页面全局搜索浮层
│   │   ├── overlay.js         # Content Script 逻辑，以 closed Shadow DOM 隔离
│   │   └── overlay.css        # 浮层专属样式（不污染亦不受宿主影响）
│   ├── newtab/                # 极简磨砂质感新标签页
│   │   ├── newtab.html        # 新标签页 DOM 结构
│   │   ├── newtab.js          # 搜索调度、快捷方式管理、设置弹窗逻辑
│   │   └── newtab.css         # 磨砂玻璃、自适应宫格、浅蓝扫光动效
│   └── shared/                # 复用组件库
│       ├── i18n.js            # 浮层与新标签页共用的中英文案模块
│       ├── results-panel.js   # 浮层与新标签页共用的分组结果渲染组件
│       └── results-panel.css  # 结果面板排版、图标与键盘焦点样式
├── manifest.json              # Chrome 扩展 MV3 配置文件（必须留在仓库根目录）
├── AGENTS.md                  # AI Agent 协作规范（必须留在仓库根目录）
├── LICENSE                    # MIT 开源许可证
├── README.md                  # 中英双语说明文档（默认）
└── README.zh-CN.md            # 中文说明文档
```

---

### 📥 导入快速入口

在「设置 → 快速入口 → 导入」选择 iTab 备份（`.itabdata` 或相同结构的 `.json`）或浏览器导出的 HTML 书签文件，最大 10 MB。iTab 在「设置 → 备份与恢复」导出时需勾选「图标」。文件仅在本机解析，不会上传。

导入前可预览新增网站，并查看重复和无效条目数量；超过 100 个网站时只展示前 100 个，确认后仍导入全部新增网站。只迁移网站名称、HTTP/HTTPS 网址及文件顺序，文件夹会展开，不迁移组件、自定义图标或其他设置。新增入口追加到末尾，重复网址跳过，已有入口保留。取消或文件解析失败不会修改数据，保存失败会提示重试。

已用 iTab 官方网页版实际导出的默认备份验证：新增 118 个网站、跳过 9 个重复和 10 个非 HTTP/HTTPS 入口。扩展版导出尚未端到端验证。

iTab 兼容以官方网页版的 `navConfig` / `children` 结构为依据；不保证所有历史备份或扩展版格式。HTML 支持 Chrome/Edge 等浏览器的 Netscape 书签结构。无网站数据或结构不支持时会明确提示。

#### 开发验证

```sh
node --test tests/shortcut-import.test.cjs
```

测试使用 Node.js 内置测试运行器，无需安装 npm 依赖。浏览器验证时重新加载扩展，检查导入预览、重复导入、取消、保存失败及重载后的数据留存，并回归普通页面浮层、受限页面回退和新标签页搜索。

---

### 📄 仓库文档与链接

* [📜 MIT 开源协议](LICENSE)
* [🔒 隐私政策](docs/PRIVACY.md)
* [⚙️ 扩展清单](manifest.json)
* [🤖 AI Agent 规范](AGENTS.md)
* [🐛 缺陷反馈 (Issues)](https://github.com/Niall-Young/spotlight-go/issues)
* [💡 贡献代码 (Pull Requests)](https://github.com/Niall-Young/spotlight-go/pulls)

---

### 🤝 参与贡献

欢迎提出任何改进建议、新特性需求或提交代码修复：

1. Fork 本仓库；
2. 新建功能分支 (`git checkout -b feature/AmazingFeature`)；
3. 提交代码更改 (`git commit -m 'feat: Add some AmazingFeature'`)；
4. 推送至分支 (`git push origin feature/AmazingFeature`)；
5. 创建 Pull Request。

---

### 📄 开源协议

本项目基于 [MIT 许可证](LICENSE) 开放源代码。

[English](#english)

---

<a id="english"></a>
## English

### 💡 Why Spotlight Go?

Finding an open tab among dozens of windows, searching deeply nested bookmarks, or hunting down a page from your history is often slow and disruptive.

**Spotlight Go** brings the seamless, keyboard-first workflow of macOS Spotlight, Alfred, and Raycast directly into Chrome:

* **Global Search Overlay**: Press `Option + Space` (Mac) or `Ctrl + Shift + K` (Win/Linux) on any webpage to bring up a centered search modal without leaving your current work.
* **Smart Multi-Source Aggregation**: Instantly search open tabs, bookmarks, 30-day browsing history, and real-time search engine suggestions in one place.
* **Minimalist Frosted-Glass New Tab**: Enjoy a clean, distraction-free new tab page featuring an auto-focused search bar with light-blue sweep glow and customizable quick-launch shortcuts.
* **100% Vanilla & Private**: Zero frameworks, zero build steps, zero analytics, zero external servers. Fast, light, and completely on-device.

---

### ✨ Key Features

#### 🔍 Global Spotlight Search Overlay
* **Summon from Anywhere**: Single global hotkey (`Option + Space` on Mac, `Ctrl + Shift + K` on Windows/Linux).
* **Multi-Source Unified Results**:
  * 📑 **Open Tabs**: Switch directly to existing tabs (`Enter`) rather than reopening duplicates.
  * ⭐️ **Bookmarks**: Instant fuzzy matching across titles and URLs.
  * 🕒 **Browsing History**: Fast lookups from the past 30 days.
  * 💡 **Web Search Suggestions**: Real-time Google Suggestions (with automated fallback to Bing) streamed asynchronously to the end of the list.
* **Smart Cross-Source Deduplication**: Follows strict precedence (`Tabs > Bookmarks > History`) so the same URL never repeats across groups.
* **Intelligent Relevance Ranking**:
  * Exact & prefix matches on domain or title are heavily weighted.
  * Dynamically adjusted by visit counts, recency, and historical user selections.
  * Local results render with zero latency while web suggestions arrive asynchronously.
* **Input-Safe Trigger**: Preserves your keystrokes immediately upon invocation—no dropped characters even when typing quickly.
* **Non-Disruptive Opening**: Results and web searches opened from the overlay always spawn a new tab—your current page is never navigated away (existing tabs are still switched to directly).
* **Privileged Page Fallback**: When pressed on non-injectable internal pages (such as `chrome://`), automatically falls back to opening the new tab page and focusing the search bar.

#### 🪟 Minimalist Frosted-Glass New Tab
* **Centered Search Card**: Auto-focused search input with a subtle light-blue animated sweep border.
* **Shared Results Panel**: Features the same fast, grouped search results experience as the overlay.
* **Customizable Shortcut Grid**: Responsive grid layout that auto-adapts column counts, shows at most two rows with centered prev/next pager arrows when shortcuts overflow, supports bidirectional and cross-row drag-and-drop reordering within a page with live preview (cancelling restores the original order; cross-page dragging is not supported), and extracts high-resolution site favicons.
* **Two Adding Modes**: Choose **Simple** (default, preserves the current layout) or **Quick** in **Settings → Quick Links**. Quick mode appends a plus tile after all websites; click it to open a standalone dialog for a URL and optional name, with Enter to add and Escape to cancel. The plus tile uses one grid slot, moves to the next page when full, and cannot be reordered. Saving shows the page containing the new website; duplicate URLs keep a single entry.
* **Floating Settings Modal**: A bottom-right FAB opens a three-section settings modal — **General** (press-to-capture a custom overlay hotkey, toggle search sources: tabs / bookmarks / history, and UI language 中文 / English), **Quick Links** (manage quick-launch shortcuts as inline cards), and **Appearance** (theme: system / light / dark, plus four visual styles — Acrylic, Neutral, Paper, Pink — applied to both the new tab page and the search overlay).
* **Bilingual Interface**: Full Chinese / English UI across the new tab page and search overlay — defaults to the browser language (non-Chinese falls back to English) and can be switched manually in Settings → General.
* **Right-Click Context Menu**: Right-click any shortcut tile to edit the URL/title, delete it, or open it in a new background tab.

#### 🎨 Pure Design & Technical Elegance
* **Monochrome Frosted Glass**: Apple-inspired aesthetic with `backdrop-filter` blur, dark/light theme switching automatically matching your system preferences, plus four optional visual styles (Acrylic / Neutral / Paper / Pink).
* **Complete CSS Isolation**: The overlay is injected into host pages using a **closed Shadow DOM**, completely preventing style leaks or host page CSS interference.
* **Zero Dependencies & Zero Build**: 100% native HTML, CSS, and modern JavaScript. No npm packages, no bundlers, no build delay.

---

### ⌨️ Keyboard Shortcuts

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Option + Space` *(Mac)*<br>`Ctrl + Shift + K` *(Win/Linux)* | Any webpage | Open / Dismiss Spotlight Search Overlay |
| `Tab` / `Shift + Tab` | Overlay | Move selection down / up through grouped search results |
| `↑` / `↓` | New Tab | Navigate through grouped search results |
| `Enter` | Overlay / New Tab | Open selected item / Switch tab / Direct URL navigation / Web search |
| `Esc` | Overlay | Close the overlay |
| *Right-Click* | New Tab Tile | Open context menu (Edit / Delete / Open in new tab) |

> [!TIP]
> Click **更改** (Change) in the settings modal, press a new key combo, and save — the overlay then listens for it on regular pages. Chrome does not allow extensions to reprogram browser-level shortcuts, so the default hotkey remains active as a fallback (including on `chrome://` pages) and can still be managed at `chrome://extensions/shortcuts`. The browser-level hotkey itself is intercepted by Chrome before the page sees it, so it cannot be captured in the press-to-capture box; it is temporarily ignored while you are recording a new combo.

---

### ⚡ Quick Start

#### Developer Installation (Load Unpacked)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Niall-Young/spotlight-go.git
   ```
2. **Open Extensions Manager**:
   Navigate to `chrome://extensions` in Google Chrome (or Edge / Brave).
3. **Enable Developer Mode**:
   Toggle on the **Developer mode** switch in the top-right corner.
4. **Load Unpacked Extension**:
   Click **Load unpacked** in the top-left corner and select the cloned `spotlight-go` folder.
5. **Ready to Use**:
   * Open a new tab to see your new dashboard.
   * Open any regular website and press `Option + Space` (Mac) or `Ctrl + Shift + K` (Win/Linux) to invoke the Spotlight search overlay!

---

### 🔒 Permissions & Security

We believe in radical transparency. Every permission requested in `manifest.json` is strictly required for local functionality:

| Permission | Purpose |
| :--- | :--- |
| `storage` | Stores quick-launch shortcuts, the custom overlay hotkey, search-source toggles, and local ranking selection statistics (`chrome.storage.local`). |
| `tabs` | Allows searching and switching directly to already opened tabs. |
| `bookmarks` | Allows indexing and searching your local browser bookmarks. |
| `history` | Allows searching recent browsing history (past 30 days). |
| `search` | Triggers searches using your browser's default search engine when no specific result is selected. |
| `favicon` | Fetches site favicons for search result items and shortcut tiles. |
| `scripting` & `<all_urls>` | Injects the search overlay on-demand into tabs opened before the extension was reloaded. |
| `https://www.google.com/complete/*`<br>`https://*.bing.com/osjson.aspx*` | Fetches search autocompletion suggestions directly from Google (with fallback to Bing). |

> [!NOTE]
> Spotlight Go does **NOT** collect, store, or transmit any user data. All indexing and ranking happens 100% locally in your browser. For full details, see the [Privacy Policy](docs/PRIVACY.md).

---

### 📂 Architecture & File Structure

```text
spotlight-go/
├── docs/                      # Governance & policy documents
│   └── PRIVACY.md             # Privacy policy (zero data collection, all local)
├── assets/                    # Runtime assets: extension icons + style preview thumbnails
├── src/
│   ├── background/            # Manifest V3 service worker
│   │   ├── service-worker.js  # Command router, multi-source search aggregator
│   │   └── search-rank.js     # Scoring & ranking algorithm (exact/prefix, recency, visits)
│   ├── overlay/               # Spotlight search overlay
│   │   ├── overlay.js         # Content script injected with closed Shadow DOM
│   │   └── overlay.css        # Overlay UI styles (fully isolated from host page)
│   ├── newtab/                # Frosted-glass new tab page
│   │   ├── newtab.html        # New tab structure
│   │   ├── newtab.js          # Search handling, tile rendering, settings modal logic
│   │   └── newtab.css         # Frosted glass styling, responsive grid, light-blue sweep
│   └── shared/                # Shared components
│       ├── i18n.js            # Chinese / English UI strings shared by overlay & newtab
│       ├── results-panel.js   # Grouped search results list shared by overlay & newtab
│       └── results-panel.css  # Shared typography, icons, and keyboard navigation styling
├── manifest.json              # Chrome Extension MV3 manifest (must stay at repo root)
├── AGENTS.md                  # AI agent working conventions (must stay at repo root)
├── LICENSE                    # MIT open-source license
├── README.md                  # Bilingual docs (default)
└── README.zh-CN.md            # Simplified Chinese docs
```

---

### 📥 Import Quick Links

Open **Settings → Quick Links → Import** and select an iTab backup (`.itabdata` or `.json` with the same structure) or an exported browser HTML bookmark file, up to 10 MB. In iTab, export from **Settings → Backup and restore** with **Icons** selected. Files are parsed locally and are never uploaded.

Preview new websites and counts of duplicate and invalid entries before confirming. Previews show up to 100 websites; confirmation imports all new websites. Only names, HTTP/HTTPS URLs and file order are imported. Folders are flattened; widgets, custom icons and other settings are excluded. New links are appended, duplicate URLs are skipped, and existing links are preserved. Cancellation or parsing errors leave data unchanged; save failures display a retry message.

Validated with an actual default backup exported by the official iTab web app: 118 new websites, 9 duplicates skipped and 10 non-HTTP/HTTPS entries rejected. Extension-version exports have not been tested end to end.

iTab compatibility targets the official web app's `navConfig` / `children` structure; not all historical backups or extension versions are guaranteed. HTML supports the Netscape bookmark structure exported by Chrome/Edge and similar browsers. Missing website data or unsupported structures produce an explicit message.

#### Development Verification

```sh
node --test tests/shortcut-import.test.cjs
```

Tests use Node.js's built-in test runner without npm dependencies. Reload the extension for browser checks: preview, repeated imports, cancellation, save failures and persistence after reload, plus ordinary-page overlay, restricted-page fallback and new-tab search regression checks.

---

### 📄 Repository Documents

* [📜 MIT License](LICENSE)
* [🔒 Privacy Policy](docs/PRIVACY.md)
* [⚙️ Extension Manifest](manifest.json)
* [🤖 AI Agents Guide](AGENTS.md)
* [🐛 Issues & Feedback](https://github.com/Niall-Young/spotlight-go/issues)
* [💡 Pull Requests](https://github.com/Niall-Young/spotlight-go/pulls)

---

### 🤝 Contributing

Contributions, feature requests, and bug reports are welcome! Feel free to check the [Issues page](https://github.com/Niall-Young/spotlight-go/issues) or submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

### 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.


[中文](#中文) | [English](#english)

<a id="中文"></a>
### 中文

---

### 💡 设计初衷

在日常浏览器使用中，我们常常面临这些痛点：
* 打开了数十个标签页，想要切换回某个特定页面却要在标签栏反复翻找；
* 收藏的书签层级繁多，难以迅速触达；
* 想要查找几周前的浏览历史，需打断当前工作流进入繁重的历史记录页面；
* 市面上的新标签页扩展往往体积臃肿、充斥各类无用信息流或广告，甚至带来隐私风险。

**Spotlight Go** 将 macOS Spotlight、Alfred 与 Raycast 的流畅键盘操作范式完整带入 Chrome：
* **任意页面全局呼出**：在任意普通网页按下 `Option + 空格`（Mac）或 `Ctrl + Shift + K`（Windows / Linux），立刻在屏幕正中唤出聚焦搜索面板，无需离开当前页面上下文。
* **多源聚合，即打即现**：输入关键词，毫秒级聚合已打开的标签页、书签收藏、近 30 天历史记录以及实时搜索引擎建议。
* **极简磨砂质感新标签页**：黑白灰单色系与精细磨砂玻璃质感，配备浅蓝扫光居中搜索框与自适应快捷入口宫格。
* **原生纯粹，零外部依赖**：纯原生 JS / HTML / CSS，无打包器、无庞大第三方包、无任何服务器上传，100% 本地运行与隐私安全。

---

### ✨ 功能特性

#### 🔍 全局聚焦搜索浮层（Spotlight Overlay）
* **全页面随时唤起**：全局快捷键一键唤出（Mac: `Option + 空格`，Windows/Linux: `Ctrl + Shift + K`）。
* **四大数据源多维聚合**：
  * 📑 **打开的标签页**：回车即可秒级切换回已有标签，无需重复新建标签浪费系统内存。
  * ⭐️ **书签收藏**：基于标题与 URL 的极速检索。
  * 🕒 **浏览历史**：本地检索近 30 天的访问足迹。
  * 💡 **网页搜索建议**：实时拉取 Google 搜索建议（失败时无缝回退 Bing），异步追加至列表底部，体验丝滑流畅。
* **智能去重与分组优先级**：严格遵循 `标签页 > 书签 > 历史记录` 优先级，同一 URL 跨组去重，避免信息杂乱。
* **精准相关度排序算法**（`search-rank.js`）：
  * 标题与域名的精准匹配及前缀匹配享有最高权重；
  * 智能结合历史访问次数、最近访问时间以及用户过往选择行为动态打分；
  * 本地结果零延迟即时渲染，不阻塞等待网络响应。
* **按键即刻捕获**：唤起浮层时瞬间保存首个按键输入，杜绝输入法与快速敲击导致的丢字丢词。
* **不打断当前页面**：从浮层打开任何结果或发起网页搜索都会在新标签页中进行，当前页面始终保持原样（已有标签页仍直接切换）。
* **特权页面智能回退**：在 Chrome 限制页面（如 `chrome://extensions`）中触发时，自动回退打开新标签页并聚焦搜索框。

#### 🪟 极简磨砂质感新标签页（New Tab）
* **居中搜索卡片**：自动聚焦输入框，边缘搭载优雅细腻的浅蓝扫光微动效。
* **共用分组结果面板**：与浮层复用统一的高性能结果渲染组件，交互逻辑严谨一致。
* **自配置快捷方式宫格**：
  * 列数随浏览器视口宽度动态自适应，视觉平衡；
  * 最多展示两行，快捷方式超出时底部居中显示左右箭头按钮翻页；
  * 瓦片支持同页左右双向及跨行拖拽，实时预览落点并保存顺序；取消拖拽恢复原顺序，不支持跨页拖拽；
  * 自动解析并渲染站点高清 Favicon 图标。
* **两种添加方式**：在「设置 → 快速入口」选择「简洁」（默认，保留原有首页）或「快速」。快速模式在全部网站末尾增加加号卡片，点击打开独立弹窗填写网址和可选名称；支持 Enter 添加、Escape 取消。加号占一个宫格位置，满页时进入下一页，不参与排序；保存后定位到新增网站所在页，重复网址只保留一份。
* **轻量设置弹窗**：右下角悬浮按钮打开三段式设置面板——「通用」自定义浮层唤起快捷键（点击「更改」后按下组合键）、选择搜索来源（标签页 / 书签 / 历史记录）与界面语言（中文 / English）；「快速入口」以卡片列表内联新增、编辑、删除；「外观」选择主题（跟随系统 / 亮色 / 暗色）与四种视觉样式（亚克力 / 简约黑白 / 牛皮纸 / 少女粉），样式同时作用于新标签页与搜索浮层。
* **中英双语界面**：新标签页与搜索浮层完整支持中文 / English，默认按浏览器语言显示（非中文一律英文），也可在设置「通用」中手动切换。
* **右键快捷菜单**：右键点击瓦片支持直接修改网址与名称、删除快捷方式或在新标签页打开。

#### 🎨 视觉美学与技术边界
* **磨砂玻璃与明暗自适应**：沉浸式 `backdrop-filter` 磨砂模糊，随系统深色/浅色模式实时切换，并提供亚克力（默认）/ 简约黑白 / 牛皮纸 / 少女粉四种视觉样式，克制优雅。
* **闭合式 Shadow DOM 样式隔离**：浮层以 `closed Shadow DOM` 注入宿主页面，彻底隔绝页面间 CSS 样式污染，保证在任何复杂的网页上均呈现一致外观。
* **零构建与零依赖**：100% 原生现代化 Web 标准技术，代码简洁直观，修改源码即可秒级生效。

---

### ⌨️ 快捷键一览

| 快捷键 | 作用场景 | 说明 |
| :--- | :--- | :--- |
| `Option + 空格` *(Mac)*<br>`Ctrl + Shift + K` *(Win/Linux)* | 任意网页 | 唤起 / 关闭聚焦搜索浮层 |
| `Tab` / `Shift + Tab` | 搜索浮层 | 向下 / 向上移动选中项 |
| `↑` / `↓` | 新标签页 | 跨类别平滑导航搜索结果 |
| `Enter` | 搜索浮层 / 新标签页 | 打开选中项 / 切换标签页 / 网址直达 / 执行网页搜索 |
| `Esc` | 搜索浮层 | 关闭浮层 |
| *右键点击瓦片* | 新标签页 | 呼出快捷方式管理菜单（编辑 / 删除 / 新标签页打开） |

> [!TIP]
> 在设置弹窗中点击「更改」，按下新的组合键并保存即可生效（Chrome 不允许扩展程序化改键，自定义绑定由扩展在页面内监听实现）；浏览器级默认快捷键仍由 Chrome 保留，可在 `chrome://extensions/shortcuts` 查看管理，并在 `chrome://` 等不可注入页面继续作为回退唤起方式。注意：浏览器级快捷键本身会被 Chrome 在浏览器层拦截，页面收不到按键事件，无法录入到捕获框中（录入期间该按键会被暂时忽略，不会触发唤起）。注意：浏览器级快捷键本身会被 Chrome 在浏览器层拦截，页面收不到按键事件，无法录入到捕获框中（录入期间该按键会被暂时忽略，不会触发唤起）。

---

### ⚡ 安装与使用

#### 开发者模式手动安装

1. **克隆本仓库到本地**：
   ```bash
   git clone https://github.com/Niall-Young/spotlight-go.git
   ```
2. **进入扩展管理页**：
   在 Chrome 浏览器中访问 `chrome://extensions`（同样兼容 Edge、Brave 等 Chromium 浏览器）。
3. **开启开发者模式**：
   打开右上角的 **「开发者模式」** 开关。
4. **加载已解压的扩展程序**：
   点击左上角的 **「加载已解压的扩展程序」**，在文件选择框中选中刚才克隆的 `spotlight-go` 项目根目录。
5. **体验 Spotlight 聚焦搜索**：
   * 打开浏览器新标签页，即可看到沉浸式极简主页；
   * 打开任意普通网页，按下 `Option + 空格`（Mac）或 `Ctrl + Shift + K`（Windows/Linux）唤起搜索浮层！

---

### 🔒 权限说明

本项目严格遵循最小必要权限原则，各项权限的用途如下：

| 权限声明 | 用途解释 |
| :--- | :--- |
| `storage` | 保存用户自定义的快捷方式列表、浮层唤起快捷键、搜索来源开关及搜索选择频次统计（保存在 `chrome.storage.local`）。 |
| `tabs` | 检索已打开的标签页并在选中时直接切换。 |
| `bookmarks` | 本地检索用户的书签收藏夹。 |
| `history` | 本地检索近 30 天的历史访问记录。 |
| `search` | 未选择具体条目时，调用浏览器默认搜索引擎发起搜索。 |
| `favicon` | 为搜索结果和快捷瓦片渲染高清晰度站点图标。 |
| `scripting` & `<all_urls>` | 当按下快捷键时，向扩展重载前已打开的存量网页按需注入浮层脚本。 |
| `https://www.google.com/complete/*`<br>`https://*.bing.com/osjson.aspx*` | 直接向 Google（失败时回退 Bing）请求搜索关键词联想建议。 |

> [!NOTE]
> Spotlight Go **不收集、不存储、不上传** 任何用户数据，所有索引与排序逻辑全部在本地运行。详细说明请查阅 [隐私政策](docs/PRIVACY.md)。

---

### 📂 项目架构

```text
spotlight-go/
├── docs/                      # 仓库治理与政策文档
│   └── PRIVACY.md             # 隐私政策（零数据收集，全本地运行）
├── assets/                    # 运行时资源：扩展图标 + 样式预览缩略图
├── src/
│   ├── background/            # Manifest V3 后台服务（Service Worker）
│   │   ├── service-worker.js  # 快捷键监听、多源搜索聚合调度、标签页切换
│   │   └── search-rank.js     # 智能多维打分与相关度排序算法
│   ├── overlay/               # 页面全局搜索浮层
│   │   ├── overlay.js         # Content Script 逻辑，以 closed Shadow DOM 隔离
│   │   └── overlay.css        # 浮层专属样式（不污染亦不受宿主影响）
│   ├── newtab/                # 极简磨砂质感新标签页
│   │   ├── newtab.html        # 新标签页 DOM 结构
│   │   ├── newtab.js          # 搜索调度、快捷方式管理、设置弹窗逻辑
│   │   └── newtab.css         # 磨砂玻璃、自适应宫格、浅蓝扫光动效
│   └── shared/                # 复用组件库
│       ├── i18n.js            # 浮层与新标签页共用的中英文案模块
│       ├── results-panel.js   # 浮层与新标签页共用的分组结果渲染组件
│       └── results-panel.css  # 结果面板排版、图标与键盘焦点样式
├── manifest.json              # Chrome 扩展 MV3 配置文件（必须留在仓库根目录）
├── AGENTS.md                  # AI Agent 协作规范（必须留在仓库根目录）
├── LICENSE                    # MIT 开源许可证
├── README.md                  # 英文说明文档（默认）
└── README.zh-CN.md            # 中文说明文档
```

---

### 📄 仓库文档与链接

* [📜 MIT 开源协议](LICENSE)
* [🔒 隐私政策](docs/PRIVACY.md)
* [⚙️ 扩展清单](manifest.json)
* [🤖 AI Agent 规范](AGENTS.md)
* [🐛 缺陷反馈 (Issues)](https://github.com/Niall-Young/spotlight-go/issues)
* [💡 贡献代码 (Pull Requests)](https://github.com/Niall-Young/spotlight-go/pulls)

---

### 🤝 参与贡献

欢迎提出任何改进建议、新特性需求或提交代码修复：

1. Fork 本仓库；
2. 新建功能分支 (`git checkout -b feature/AmazingFeature`)；
3. 提交代码更改 (`git commit -m 'feat: Add some AmazingFeature'`)；
4. 推送至分支 (`git push origin feature/AmazingFeature`)；
5. 创建 Pull Request。

---

### 📄 开源协议

本项目基于 [MIT 许可证](LICENSE) 开放源代码。

[中文](#中文) | [English](#english)

[中文](#中文)
