<div align="center">

<img src="assets/icon-128.png" width="96" height="96" alt="Spotlight Go Logo" />

# Spotlight Go

**类 macOS Spotlight 体验的键盘优先全局聚焦搜索浮层与极简磨砂质感新标签页。**

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-10b981.svg?style=flat-square&logo=googlechrome&logoColor=white)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Privacy: Zero Tracking](https://img.shields.io/badge/Privacy-零数据收集-purple.svg?style=flat-square)](PRIVACY.md)
[![Platform: Chromium](https://img.shields.io/badge/Platform-Chrome%20%7C%20Edge%20%7C%20Brave-informational.svg?style=flat-square)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/Niall-Young/spotlight-go/pulls)
[![GitHub Stars](https://img.shields.io/github/stars/Niall-Young/spotlight-go?style=flat-square&color=ffd700)](https://github.com/Niall-Young/spotlight-go/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/Niall-Young/spotlight-go?style=flat-square&color=orange)](https://github.com/Niall-Young/spotlight-go/issues)

<p align="center">
  <a href="README.md">English</a> • <b>简体中文</b>
</p>

<p align="center">
  <a href="#-设计初衷">设计初衷</a> •
  <a href="#-功能特性">功能特性</a> •
  <a href="#-快捷键一览">快捷键一览</a> •
  <a href="#-安装与使用">安装与使用</a> •
  <a href="#-权限说明">权限说明</a> •
  <a href="#-项目架构">项目架构</a> •
  <a href="PRIVACY.md">隐私政策</a> •
  <a href="LICENSE">开源协议</a>
</p>

</div>

---

## 💡 设计初衷

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

## ✨ 功能特性

### 🔍 全局聚焦搜索浮层（Spotlight Overlay）
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

### 🪟 极简磨砂质感新标签页（New Tab）
* **居中搜索卡片**：自动聚焦输入框，边缘搭载优雅细腻的浅蓝扫光微动效。
* **共用分组结果面板**：与浮层复用统一的高性能结果渲染组件，交互逻辑严谨一致。
* **自配置快捷方式宫格**：
  * 列数随浏览器视口宽度动态自适应，视觉平衡；
  * 最多展示两行，快捷方式超出时底部居中显示左右箭头按钮翻页；
  * 瓦片支持按住拖拽实时预览落点、调整顺序，排序结果自动保存；
  * 自动解析并渲染站点高清 Favicon 图标。
* **轻量设置弹窗**：右下角悬浮按钮打开三段式设置面板——点击「更改」后按下组合键即可自定义浮层唤起快捷键；快捷入口以卡片列表内联新增、编辑、删除；并可通过开关选择搜索来源（书签 / 历史记录）。
* **右键快捷菜单**：右键点击瓦片支持直接修改网址与名称、删除快捷方式或在新标签页打开。

### 🎨 视觉美学与技术边界
* **磨砂玻璃与明暗自适应**：沉浸式 `backdrop-filter` 磨砂模糊，随系统深色/浅色模式实时切换，克制优雅。
* **闭合式 Shadow DOM 样式隔离**：浮层以 `closed Shadow DOM` 注入宿主页面，彻底隔绝页面间 CSS 样式污染，保证在任何复杂的网页上均呈现一致外观。
* **零构建与零依赖**：100% 原生现代化 Web 标准技术，代码简洁直观，修改源码即可秒级生效。

---

## ⌨️ 快捷键一览

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

## ⚡ 安装与使用

### 开发者模式手动安装

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

## 🔒 权限说明

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
> Spotlight Go **不收集、不存储、不上传** 任何用户数据，所有索引与排序逻辑全部在本地运行。详细说明请查阅 [隐私政策](PRIVACY.md)。

---

## 📂 项目架构

```text
spotlight-go/
├── assets/                    # 图标与矢量资源（SVG / PNG）
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
│       ├── results-panel.js   # 浮层与新标签页共用的分组结果渲染组件
│       └── results-panel.css  # 结果面板排版、图标与键盘焦点样式
├── manifest.json              # Chrome 扩展 MV3 配置文件
├── PRIVACY.md                 # 隐私政策说明文件
├── LICENSE                    # MIT 开源许可证
├── README.md                  # 英文说明文档
└── README_zh.md               # 中文说明文档
```

---

## 📄 仓库文档与链接

* [📜 MIT 开源协议](LICENSE)
* [🔒 隐私政策](PRIVACY.md)
* [⚙️ 扩展清单](manifest.json)
* [🤖 AI Agent 规范](AGENTS.md)
* [🐛 缺陷反馈 (Issues)](https://github.com/Niall-Young/spotlight-go/issues)
* [💡 贡献代码 (Pull Requests)](https://github.com/Niall-Young/spotlight-go/pulls)

---

## 🤝 参与贡献

欢迎提出任何改进建议、新特性需求或提交代码修复：

1. Fork 本仓库；
2. 新建功能分支 (`git checkout -b feature/AmazingFeature`)；
3. 提交代码更改 (`git commit -m 'feat: Add some AmazingFeature'`)；
4. 推送至分支 (`git push origin feature/AmazingFeature`)；
5. 创建 Pull Request。

---

## 📄 开源协议

本项目基于 [MIT 许可证](LICENSE) 开放源代码。
