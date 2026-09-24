<div align="center">

<img src="assets/icon.svg" width="96" height="96" alt="Spotlight Go Logo" />

# Spotlight Go

**A lightning-fast, keyboard-driven Spotlight search overlay & minimalist frosted-glass new tab for Google Chrome.**

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-10b981.svg?style=flat-square&logo=googlechrome&logoColor=white)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Privacy: Zero Tracking](https://img.shields.io/badge/Privacy-Zero_Data_Collection-purple.svg?style=flat-square)](PRIVACY.md)
[![Platform: Chromium](https://img.shields.io/badge/Platform-Chrome%20%7C%20Edge%20%7C%20Brave-informational.svg?style=flat-square)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/Niall-Young/spotlight-go/pulls)
[![GitHub Stars](https://img.shields.io/github/stars/Niall-Young/spotlight-go?style=flat-square&color=ffd700)](https://github.com/Niall-Young/spotlight-go/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/Niall-Young/spotlight-go?style=flat-square&color=orange)](https://github.com/Niall-Young/spotlight-go/issues)

<p align="center">
  <b>English</b> • <a href="README_zh.md">简体中文</a>
</p>

<p align="center">
  <a href="#-why-spotlight-go">Why Spotlight Go?</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-keyboard-shortcuts">Shortcuts</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-permissions">Permissions</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="PRIVACY.md">Privacy</a> •
  <a href="LICENSE">License</a>
</p>

</div>

---

## 💡 Why Spotlight Go?

Finding an open tab among dozens of windows, searching deeply nested bookmarks, or hunting down a page from your history is often slow and disruptive.

**Spotlight Go** brings the seamless, keyboard-first workflow of macOS Spotlight, Alfred, and Raycast directly into Chrome:

* **Global Search Overlay**: Press `Option + Space` (Mac) or `Ctrl + Shift + K` (Win/Linux) on any webpage to bring up a centered search modal without leaving your current work.
* **Smart Multi-Source Aggregation**: Instantly search open tabs, bookmarks, 30-day browsing history, and real-time search engine suggestions in one place.
* **Minimalist Frosted-Glass New Tab**: Enjoy a clean, distraction-free new tab page featuring an auto-focused search bar with light-blue sweep glow and customizable quick-launch shortcuts.
* **100% Vanilla & Private**: Zero frameworks, zero build steps, zero analytics, zero external servers. Fast, light, and completely on-device.

---

## ✨ Key Features

### 🔍 Global Spotlight Search Overlay
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
* **Privileged Page Fallback**: When pressed on non-injectable internal pages (such as `chrome://`), automatically falls back to opening the new tab page and focusing the search bar.

### 🪟 Minimalist Frosted-Glass New Tab
* **Centered Search Card**: Auto-focused search input with a subtle light-blue animated sweep border.
* **Shared Results Panel**: Features the same fast, grouped search results experience as the overlay.
* **Customizable Shortcut Grid**: Responsive grid layout that auto-adapts column counts and extracts high-resolution site favicons.
* **Floating Settings Modal**: Clean bottom-right FAB button opens a dedicated modal to add, edit, or delete quick-launch shortcuts, and view current overlay shortcuts.
* **Right-Click Context Menu**: Right-click any shortcut tile to edit the URL/title, delete it, or open it in a new background tab.

### 🎨 Pure Design & Technical Elegance
* **Monochrome Frosted Glass**: Apple-inspired aesthetic with `backdrop-filter` blur, dark/light theme switching automatically matching your system preferences.
* **Complete CSS Isolation**: The overlay is injected into host pages using a **closed Shadow DOM**, completely preventing style leaks or host page CSS interference.
* **Zero Dependencies & Zero Build**: 100% native HTML, CSS, and modern JavaScript. No npm packages, no bundlers, no build delay.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Option + Space` *(Mac)*<br>`Ctrl + Shift + K` *(Win/Linux)* | Any webpage | Open / Dismiss Spotlight Search Overlay |
| `↑` / `↓` | Overlay / New Tab | Navigate through grouped search results |
| `Enter` | Overlay / New Tab | Open selected item / Switch tab / Direct URL navigation / Web search |
| `Esc` | Overlay | Close the overlay |
| *Right-Click* | New Tab Tile | Open context menu (Edit / Delete / Open in new tab) |

> [!TIP]
> You can customize your favorite shortcut at any time by visiting `chrome://extensions/shortcuts` in your browser.

---

## ⚡ Quick Start

### Developer Installation (Load Unpacked)

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

## 🔒 Permissions & Security

We believe in radical transparency. Every permission requested in `manifest.json` is strictly required for local functionality:

| Permission | Purpose |
| :--- | :--- |
| `storage` | Stores user-configured shortcuts and local ranking selection statistics (`chrome.storage.local`). |
| `tabs` | Allows searching and switching directly to already opened tabs. |
| `bookmarks` | Allows indexing and searching your local browser bookmarks. |
| `history` | Allows searching recent browsing history (past 30 days). |
| `search` | Triggers searches using your browser's default search engine when no specific result is selected. |
| `favicon` | Fetches site favicons for search result items and shortcut tiles. |
| `scripting` & `<all_urls>` | Injects the search overlay on-demand into tabs opened before the extension was reloaded. |
| `https://www.google.com/complete/*`<br>`https://*.bing.com/osjson.aspx*` | Fetches search autocompletion suggestions directly from Google (with fallback to Bing). |

> [!NOTE]
> Spotlight Go does **NOT** collect, store, or transmit any user data. All indexing and ranking happens 100% locally in your browser. For full details, see the [Privacy Policy](PRIVACY.md).

---

## 📂 Architecture & File Structure

```text
spotlight-go/
├── assets/                    # Application icons & vector graphics (SVG, PNG)
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
│       ├── results-panel.js   # Grouped search results list shared by overlay & newtab
│       └── results-panel.css  # Shared typography, icons, and keyboard navigation styling
├── manifest.json              # Chrome Extension MV3 manifest
├── PRIVACY.md                 # Privacy policy
├── LICENSE                    # MIT open-source license
└── README.md                  # Project documentation
```

---

## 📄 Repository Documents

* [📜 MIT License](LICENSE)
* [🔒 Privacy Policy](PRIVACY.md)
* [⚙️ Extension Manifest](manifest.json)
* [🤖 AI Agents Guide](AGENTS.md)
* [🐛 Issues & Feedback](https://github.com/Niall-Young/spotlight-go/issues)
* [💡 Pull Requests](https://github.com/Niall-Young/spotlight-go/pulls)

---

## 🤝 Contributing

Contributions, feature requests, and bug reports are welcome! Feel free to check the [Issues page](https://github.com/Niall-Young/spotlight-go/issues) or submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.
