# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**WordWorkshop** — Cross-browser extension (Manifest V3, Chrome + Firefox) for offline English dictionary lookups. Double-click any word on a webpage or open the popup (`Ctrl+Alt+S`) to see definitions, IPA pronunciation, etymology, synonyms, and antonyms.

Published at: https://addons.mozilla.org/en-US/firefox/addon/dictionary-browser-extension/
Repository: https://github.com/aetiss/dictionary_browser_extension

## Key Facts

- **No build step.** Plain vanilla JS/HTML/CSS — files load directly into the browser.
- **`data/` is gitignored.** Must be generated or downloaded before the extension works.
- **Two data sources:** Wiktionary (full, 1.3M+ words, IPA/etymology) and Wordset (108k words, CI only).
- **101 unit tests** using Node's built-in `node:test` — run with `npm test`.
- **Playwright E2E** — run with `npm run test:e2e` (requires `data/` to exist).

## Development Setup

```bash
npm install                         # installs Playwright dev dependency only

# Get dictionary data — choose one:
node scripts/download-data.js       # fast: download pre-built from GitHub releases
node scripts/prepare-wiktionary.js  # slow: build from Wiktionary source (~10 min)

# Load in Firefox: about:debugging → Load Temporary Add-on → manifest.json
# Load in Chrome:  chrome://extensions → Developer mode → Load unpacked
```

## Architecture

Three execution contexts communicate via `browser.runtime.sendMessage`:

### `content.js`
Injected into all pages. Captures double-click selections via `window.getSelection()`. Responds to popup messages with the current selected keyword. Creates inline tooltips (`createTooltip()`) showing word, IPA, etymology, and definitions.

### `browserAction/` (popup)
- **`dictionary.js`** — Lazy-loads `data/{letter}.json` by first letter. Caches loaded files in popup session memory. Implements `lookupWord(word)` with built-in stemmer fallback.
- **`script.js`** — Orchestration: query content script → validate → check LRU cache → lookup → render. Also owns the TTS click handler (`speechSynthesis`).
- **`util.js`** — `checkCache()`/`setCache()` (LRU-20 in `browser.storage.local`), `setDefinition(entry, stemInfo)` (DOM rendering with IPA/etymology/antonyms), `validateKeyword()`.

### `options/`
Keyboard shortcut customisation via `browser.commands`. Theme switcher (System/Light/Dark) stored in `browser.storage.local`. Theme applied at startup by reading storage and setting `data-theme` attribute on `<html>`.

## Data Pipeline

```
kaikki.org (Wiktionary JSONL)
    ↓ scripts/prepare-wiktionary.js
data/{a-z,misc}.json   (~60 MB, gitignored)
```

### `scripts/prepare-wiktionary.js`
Streams kaikki.org English Wiktionary JSONL. Uses `miniEntry()` to trim raw objects to only the 4 fields needed before storing in memory (~200 bytes/entry vs 1-5 KB raw). Calls `stripEntry()` to produce the final stripped format. Exports: `extractIPA`, `stripEntry`, `normalisePos`, `getLetterFile` (tested).

### `scripts/prepare-wordset.js`
Faster alternative using the Wordset Dictionary GitHub repo. Produces the same JSON shape but without IPA/etymology/antonyms. **Used by CI E2E** (generates in ~30s vs ~10 min for Wiktionary).

### `scripts/download-data.js`
Downloads `dictionary-data.tar.gz` from the latest GitHub release and extracts to `data/`. This is the recommended path for contributors who don't need to modify the data pipeline.

### Stripped entry format
```json
{
  "apple": {
    "word": "apple",
    "ipa": "/ˈæp.əl/",
    "etymology": "From Middle English appel…",
    "meanings": [
      {
        "def": "A common round fruit.",
        "speech_part": "noun",
        "example": "I ate an apple.",
        "synonyms": ["pome"],
        "antonyms": []
      }
    ]
  }
}
```
All fields except `word` and `meanings` are optional. IPA/etymology are omitted when absent from Wiktionary.

## Cross-browser Compatibility

```js
const api = globalThis.browser ?? globalThis.chrome;
```

All extension API calls (`api.runtime`, `api.storage`, `api.commands`, `api.tabs`) go through this shim. Firefox provides `browser.*` (Promise-based), Chrome provides `chrome.*`.

## Key Technical Details

- **MV3** with `browser_specific_settings.gecko` for Firefox AMO
- **Permissions:** `activeTab`, `storage` only — no network access during lookups
- **LRU cache:** 20 recent words in `browser.storage.local` under key `recentWords`
  - Stored as `{ originalSearch, definition, stemInfo }`
  - `checkCache()` matches case-insensitively
- **Stemmer:** in `dictionary.js`, tries progressively shorter suffixes if exact lookup fails; returns `stemInfo = { from, to }` for the UI stem notice
- **Tooltip isolation:** `content.css` uses `dict-ext-` class prefix on all rules; CSS vars scoped to `.dict-ext-tooltip` not `:root`
- **Theme:** `data-theme="dark"` on `<html>` element; CSS vars in `:root` and `[data-theme="dark"]` blocks; system theme detected via `window.matchMedia('(prefers-color-scheme: dark)')`. Color palette from [colorhunt.co/palette/f4f0e444a194537d96ec8f8d](https://colorhunt.co/palette/f4f0e444a194537d96ec8f8d) — `#F4F0E4` cream, `#44A194` teal (primary accent), `#537D96` steel blue (etymology / secondary), `#EC8F8D` salmon (errors)
- **TTS:** `speechSynthesis.speak(new SpeechSynthesisUtterance(word))` — no permissions needed; guarded by `typeof speechSynthesis !== 'undefined'`

## CI/CD

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push / PR to `master` | Unit tests · Playwright E2E · Manifest lint (version sync check) |
| `release.yml` | Tag push `v*.*.*` | Tests + Wiktionary data build (parallel) → package Chrome/Firefox zips + `dictionary-data.tar.gz` → GitHub release |
| `version-bump.yml` | Manual dispatch | Bumps version in `manifest.json` + `package.json`, commits, pushes tag → triggers `release.yml` |

**Release flow:**
1. Run `version-bump.yml` (dispatch: patch / minor / major) — bumps versions, pushes tag
2. `release.yml` triggers automatically on the tag:
   - `test` job: unit tests (5 files) + E2E with Wordset data (fast)
   - `build-data` job: full Wiktionary build → `dictionary-data.tar.gz` (runs parallel with tests)
   - `package` job: downloads data artifact, zips extension with Wiktionary data, creates GitHub release with all 3 assets
3. Optionally: `publish-firefox` / `publish-chrome` (enabled via repo variables)

**CI E2E uses `prepare-wordset.js`** (fast, ~30 s). Wiktionary data is built only in `release.yml`.

## Running Tests

```bash
npm test                       # all 101 unit tests
npm run test:e2e               # Playwright E2E (data/ must exist)
npm run test:all               # both

# Individual test files:
node --test tests/background.test.js
node --test tests/content.test.js
node --test tests/util.test.js
node --test tests/prepare-wiktionary.test.js
node --test tests/prepare-wordset.test.js
```

Unit tests use `node:vm` to run browser extension code in a sandboxed context with mock DOM and mock browser API. No browser binary or bundler required.

## Common Pitfalls

- **`data/` not found:** Run `node scripts/download-data.js` or `node scripts/prepare-wordset.js` first.
- **OOM during prepare-wiktionary:** The `miniEntry()` function (added in v4) handles this. If it still OOMs, pass `--max-old-space-size=4096` to node.
- **`browser` is undefined in tests:** Tests inject a mock via `globalThis.browser = mockApi` in the vm context.
- **`speechSynthesis` undefined in tests:** Always guard with `typeof speechSynthesis !== 'undefined'` in extension code; tests don't mock it and it should be skipped silently.
- **E2E flakiness:** Use text-node-only selectors in Playwright; avoid `innerText` on elements that mix bold/italic children. See `tests/e2e.spec.js` for patterns.
