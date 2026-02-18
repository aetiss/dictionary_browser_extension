# WordWorkshop

[![CI](https://github.com/aetiss/dictionary_browser_extension/actions/workflows/ci.yml/badge.svg)](https://github.com/aetiss/dictionary_browser_extension/actions/workflows/ci.yml)
[![Firefox Add-on](https://img.shields.io/amo/v/dictionary-browser-extension?label=Firefox%20Add-on&logo=firefox)](https://addons.mozilla.org/en-US/firefox/addon/dictionary-browser-extension/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Instant definitions, IPA pronunciation, etymology, and synonyms — fully offline.**

Double-click any word on any webpage for a clean tooltip. Open the popup (`Ctrl+Alt+S`) to look up any word with full detail. No API keys. No internet required after setup. Works on **Firefox** and **Chrome/Edge** (Manifest V3).

---

## Features

| | Feature | Detail |
|---|---|---|
| 📖 | **1.3M+ words** | Full English Wiktionary — far more coverage than typical offline dictionaries |
| 🔊 | **IPA + Text-to-speech** | Phonetic notation (e.g. `/ˈhɛl.oʊ/`) + browser-native TTS, zero extra permissions |
| 📜 | **Etymology** | Word origin and history from Wiktionary |
| 🔗 | **Synonyms & antonyms** | Shown per definition, sourced from Wiktionary sense data |
| 🌐 | **Inline tooltip** | Double-click any word on any webpage |
| 🌓 | **Dark / Light / System theme** | Follows OS preference by default, overridable in Settings |
| ⚡ | **Smart stemming** | "running" → looks up "run"; "cats" → "cat", with a stem notice |
| 💾 | **LRU cache** | Last 20 lookups cached for instant re-lookup |
| ⌨️ | **Keyboard shortcut** | `Ctrl+Alt+S` / `Cmd+Alt+S` — customisable in Settings |

---

## Quick Start

### 1 — Clone and install dev dependencies

```bash
git clone https://github.com/aetiss/dictionary_browser_extension.git
cd dictionary_browser_extension
npm install
```

### 2 — Get dictionary data (choose one)

**Option A — Download pre-built (~60 MB, ~30 seconds)**
```bash
node scripts/download-data.js
```
Fetches pre-processed `data/*.json` files from the latest GitHub release.

**Option B — Build from Wiktionary source (~230 MB download, 5–10 min)**
```bash
node scripts/prepare-wiktionary.js
```
Streams directly from [kaikki.org](https://kaikki.org/dictionary/English/) and builds locally. Use this for the absolute latest Wiktionary data or when developing the pipeline.

### 3 — Load the extension

**Firefox**
1. Go to `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on** → select `manifest.json`

**Chrome / Edge**
1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select the project folder

> No build step. Save a file → reload the extension → changes are live.

---

## Data Sources & Pipeline

```
kaikki.org (Wiktionary extract, ~230 MB)
    │
    ▼
scripts/prepare-wiktionary.js    ← full pipeline, runs locally or in data-release CI
    │  streams JSONL, miniEntry() trims to ~200 bytes/entry, stripEntry() formats
    ▼
data/{a-z,misc}.json             ← gitignored, ~60 MB total
    │
    ▼  (alternatively)
scripts/download-data.js         ← downloads pre-built data from GitHub release assets
```

| Script | Source | Words | IPA | Etymology | Antonyms | Use case |
|---|---|---|---|---|---|---|
| `prepare-wiktionary.js` | Wiktionary via kaikki.org | 1.3M+ | ✓ | ✓ | ✓ | Local dev · Releases |
| `prepare-wordset.js` | Wordset Dictionary | 108k | ✗ | ✗ | ✗ | CI E2E (fast, 30 s) |
| `download-data.js` | GitHub release assets | same as Wiktionary | ✓ | ✓ | ✓ | Quick local setup |

The `data/` directory is **gitignored** — it is built by a prepare script and published as a release asset (`dictionary-data.tar.gz`) by the `data-release` CI workflow on every tagged release.

---

## Architecture

```
Webpage
  └─ content.js          double-click capture · inline tooltip rendering
        │  runtime.sendMessage
        ▼
Popup  (browserAction/)
  ├─ script.js           orchestration: capture → validate → cache → lookup → render
  ├─ dictionary.js       lazy-loads data/{letter}.json, caches in session memory
  └─ util.js             LRU cache · DOM rendering · validateKeyword()

Options  (options/)
  └─ options.js          keyboard shortcut (browser.commands) · theme (storage)
```

**Lookup flow:**
```
double-click word on page
  → content.js getSelectedText()
  → popup runtime.sendMessage → getKeyword
  → validateKeyword (reject multi-word)
  → checkCache (browser.storage.local, LRU-20)
  → dictionary.lookupWord(word)         ← lazy fetch data/{letter}.json
      if miss → stemmer fallback (strips suffixes, retries)
  → setDefinition(entry, stemInfo)      ← populates IPA, etymology, defs, syn/ant
  → setCache(word, entry, stemInfo)
```

**Stripped entry shape** (`data/a.json` etc.):
```json
{
  "apple": {
    "word": "apple",
    "ipa": "/ˈæp.əl/",
    "etymology": "From Middle English appel, from Old English æppel…",
    "meanings": [
      {
        "def": "A common round fruit produced by the apple tree.",
        "speech_part": "noun",
        "example": "I ate an apple.",
        "synonyms": ["pome"],
        "antonyms": []
      }
    ]
  }
}
```

---

## Development

### Tests

```bash
npm test              # 101 unit tests — no external dependencies, fast
npm run test:e2e      # Playwright E2E (requires data/ to exist)
npm run test:all      # both
```

Unit tests use Node's built-in `node:test` and `node:vm` — no Jest, no Mocha.

### Project layout

```
browserAction/
  index.html            popup UI
  script.js             orchestration + TTS handler
  dictionary.js         data loader (lazy per-letter fetch + session cache)
  util.js               LRU cache · DOM renderer · keyword validator
  style.css             popup styles (Solarized Earthy palette)
content.js              injected into all web pages
content.css             tooltip styles (scoped via dict-ext- prefix)
options/
  options.html/js/css   keyboard shortcut + theme settings
manifest.json           MV3 manifest, gecko ID for Firefox AMO
scripts/
  prepare-wiktionary.js full Wiktionary pipeline → data/
  prepare-wordset.js    quick Wordset pipeline → data/ (CI use)
  download-data.js      download pre-built data from GitHub releases
tests/
  background.test.js    background service worker tests
  content.test.js       tooltip and message handling tests
  util.test.js          cache, DOM rendering, keyword validation tests
  prepare-wordset.test.js   Wordset pipeline tests
  prepare-wiktionary.test.js  extractIPA, stripEntry, POS mapping tests
  e2e.spec.js           Playwright full-browser tests
data/                   ← gitignored, generated by prepare scripts
```

### Cross-browser compatibility

```js
const api = globalThis.browser ?? globalThis.chrome;
```

Firefox provides `browser.*` (Promise-based). Chrome provides `chrome.*`. The shim covers all `api.runtime`, `api.storage`, `api.commands`, `api.tabs` calls.

### Releasing

1. Bump `version` in `manifest.json` and `package.json`
2. Create and push a tag:
   ```bash
   git tag v4.x.x && git push origin v4.x.x
   ```
3. Create a GitHub release for that tag
4. The `data-release` workflow triggers automatically:
   - Builds Wiktionary data on a GitHub Actions runner
   - Publishes `dictionary-data.tar.gz` as a release asset
5. Submit updated extension files to [Firefox AMO](https://addons.mozilla.org/) and/or the Chrome Web Store

---

## CI/CD

| Workflow | Trigger | Jobs |
|---|---|---|
| `ci.yml` | Push / PR to `master` | Unit tests · Playwright E2E · Manifest lint |
| `data-release.yml` | GitHub release published | Build Wiktionary data · Upload `dictionary-data.tar.gz` |

E2E tests in CI use the fast `prepare-wordset.js` script (~30 s) so the pipeline stays quick. The full Wiktionary pipeline only runs on releases.

---

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Read selected text from the active tab |
| `storage` | Persist the 20-word LRU cache and user theme/shortcut settings |

No network access during normal use. No tracking. No telemetry.

---

## License

[MIT](LICENSE) · Dictionary data from [Wiktionary](https://en.wiktionary.org/) (CC BY-SA 3.0) via [kaikki.org](https://kaikki.org/).
