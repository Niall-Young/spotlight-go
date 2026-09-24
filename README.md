# spotlight-go

Chrome 扩展（Manifest V3）：Spotlight 风格的聚焦搜索 + 黑白灰磨砂玻璃质感的新标签页。

## 功能

- **聚焦搜索浮层**：任意页面按 `Cmd+Shift+K`（Windows/Linux：`Ctrl+Shift+K`）在当前页弹出居中搜索浮层，聚合搜索：
  - 网页搜索建议（Google，失败时回退 Bing）
  - 打开的标签页（Enter 切换而非新开）
  - 书签
  - 历史记录（近 30 天）
  - `↑↓` 跨组导航、`Enter` 打开、`Esc` 关闭；无结果时 `Enter` 直接搜索（输入形如网址时直接跳转）
  - 在 `chrome://` 等无法注入的页面按快捷键，回退为打开新标签页并聚焦搜索框
- **新标签页**：居中大搜索框（自动聚焦）+ 常用网站快捷方式（最常访问站点自动填充，最多 8 个）
  - 右键瓦片：固定 / 取消固定、在新标签页打开
  - `+ 添加` 瓦片：手动添加固定快捷方式（持久化保存）
- **视觉**：黑白灰单色系 + `backdrop-filter` 磨砂玻璃；跟随系统明暗主题自动切换

## 技术

原生 JS / HTML / CSS，零构建步骤。

```
manifest.json
assets/                    图标
src/background/            service worker：快捷键命令、聚合搜索、打开结果
src/shared/                分组结果面板（overlay 与 newtab 复用）
src/overlay/               聚焦搜索浮层（closed Shadow DOM 隔离宿主页面样式）
src/newtab/                新标签页
```

## 安装（开发）

1. 打开 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本仓库根目录
4. 打开新标签页，或在任意页面按 `Cmd+Shift+K` / `Ctrl+Shift+K`

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `storage` | 保存固定的快捷方式 |
| `bookmarks` / `history` / `tabs` / `topSites` | 聚合搜索与快捷方式 |
| `search` | 使用浏览器默认搜索引擎执行搜索 |
| `favicon` | 结果与瓦片的站点图标 |
| `scripting`、`<all_urls>` | 按快捷键时向未注入浮层的页面（如扩展重载前已打开的标签页）按需补注入浮层脚本 |
| `https://www.google.com/complete/*`、`https://*.bing.com/osjson.aspx*` | 网页搜索建议接口 |
