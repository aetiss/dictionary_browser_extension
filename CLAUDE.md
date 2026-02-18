# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cross-browser extension (Manifest V3, Chrome + Firefox) that lets users look up dictionary definitions offline. Users double-click a word on any webpage, open the popup (`Ctrl+Alt+S` or toolbar icon), and see the definition rendered in the popup.

Uses a **bundled Wordset Dictionary** (~23MB, 108k+ words) — no internet required for lookups.

Published at: https://addons.mozilla.org/en-US/firefox/addon/dictionary-browser-extension/

## Development Setup

There is **no build step, package manager, test suite, or linter**. The extension is plain vanilla JS/HTML/CSS loaded directly into the browser.

1. **First time:** Run `node scripts/prepare-wordset.js` to download and prepare the dictionary data files into `data/`
2. **Firefox:** Go to `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select `manifest.json`
3. **Chrome:** Go to `chrome://extensions` → Enable **Developer mode** → **Load unpacked** → select the project directory

No API keys or configuration files are needed.

## Architecture

Three execution contexts communicate via messaging APIs:

- **`content.js`** — Injected into all web pages. Captures selected text on double-click via `window.getSelection()` and responds to messages from the popup with the selected keyword.

- **`browserAction/`** (popup) — The main UI shown when the toolbar icon is clicked.
  - `dictionary.js` — Lazy-loads bundled dictionary JSON files by letter (`data/a.json` through `data/z.json`). Caches loaded letter files in memory for the popup session.
  - `script.js` — Orchestrates: queries content script for selected word → validates → checks LRU cache → calls `lookupWord()` from `dictionary.js` → renders result using `util.js`.
  - `util.js` — Core logic: `checkCache()`/`setCache()` for LRU cache (20 words in `browser.storage.local` under key `recentWords`), `setDefinition()` for DOM rendering, `validateKeyword()` to reject multi-word input.

- **`options/`** — Settings page for keyboard shortcut customization via `browser.commands` API. Theme switcher UI exists but is not yet implemented.

- **`scripts/prepare-wordset.js`** — One-time Node.js script to download and strip dictionary data from the Wordset Dictionary GitHub repo.

- **`data/`** — 27 JSON files (a-z + misc) containing stripped Wordset Dictionary entries keyed by word.

**Data flow:** double-click word → content script captures selection → popup requests keyword via messaging → LRU cache check → lazy-load letter JSON file → look up word → cache result → render definition.

## Cross-browser Compatibility

All JS files use `const api = globalThis.browser ?? globalThis.chrome;` as a compatibility shim. Firefox provides `browser.*`, Chrome provides `chrome.*`. The `api` variable is used for all extension API calls (`api.runtime`, `api.tabs`, `api.storage`, `api.commands`).

## Key Technical Details

- Manifest V3 with `browser_specific_settings.gecko` for Firefox compatibility
- Dictionary data from Wordset Dictionary (CC BY-SA 4.0, built on Princeton WordNet)
- Manifest permissions: `activeTab`, `storage`
- LRU cache stores up to 20 recent words in `browser.storage.local`
- Dictionary JSON files lazy-loaded by first letter of word via `fetch(api.runtime.getURL(...))`
