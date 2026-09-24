# spotlight-go

Chrome 扩展（Manifest V3）：Spotlight 风格的聚焦搜索 + 黑白灰磨砂玻璃质感的新标签页。

## 功能

- **聚焦搜索浮层**：任意页面按 `Option+空格`（Windows/Linux：`Ctrl+Shift+K`）在当前页弹出居中搜索浮层，聚合搜索：
  - 打开的标签页（Enter 切换而非新开）
  - 书签
  - 历史记录（近 30 天）
  - 网页搜索建议（Google，失败时回退 Bing），异步追加在列表尾部
  - 本地结果即时渲染（不等网络）；各组按相关度打分排序（标题/域名精确与前缀匹配优先，结合访问次数、最近访问时间与历史选择记录），同一 URL 跨组去重（标签页 > 书签 > 历史）
  - `↑↓` 跨组导航、`Enter` 打开、`Esc` 关闭；无结果时 `Enter` 直接搜索（输入形如网址时直接跳转）
  - 在 `chrome://` 等无法注入的页面按快捷键，回退为打开新标签页并聚焦搜索框
- **新标签页**：居中大搜索框（自动聚焦）+ 用户自配置的快捷方式宫格（自动解析站点 favicon，列数随窗口宽度自适应）
  - 右下角悬浮设置按钮打开设置弹窗：在列表中新增/编辑/删除快捷方式（网址 + 可选名称，持久化保存），保存后页面宫格即时更新；并展示浮层唤起快捷键（默认 `Option+空格` / `Ctrl+Shift+K`，经浏览器快捷键设置页修改）
  - 右键瓦片：编辑（修改网址/名称）、删除、在新标签页打开
- **视觉**：黑白灰单色系 + `backdrop-filter` 磨砂玻璃；跟随系统明暗主题自动切换

## 技术

原生 JS / HTML / CSS，零构建步骤。

```
manifest.json
assets/                    图标
src/background/            service worker：快捷键命令、聚合搜索（search-rank.js 打分）、打开结果
src/shared/                分组结果面板（overlay 与 newtab 复用）
src/overlay/               聚焦搜索浮层（closed Shadow DOM 隔离宿主页面样式）
src/newtab/                新标签页
```

## 安装（开发）

1. 打开 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本仓库根目录
4. 打开新标签页，或在任意页面按 `Option+空格`（Mac）/ `Ctrl+Shift+K`（Windows/Linux）

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `storage` | 保存用户配置的快捷方式与搜索选择统计（用于结果排序） |
| `bookmarks` / `history` / `tabs` | 聚合搜索 |
| `search` | 使用浏览器默认搜索引擎执行搜索 |
| `favicon` | 结果与瓦片的站点图标 |
| `scripting`、`<all_urls>` | 按快捷键时向未注入浮层的页面（如扩展重载前已打开的标签页）按需补注入浮层脚本 |
| `https://www.google.com/complete/*`、`https://*.bing.com/osjson.aspx*` | 网页搜索建议接口 |

## 开源协议

本项目采用 [MIT License](LICENSE) 开源。
