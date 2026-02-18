const api = globalThis.browser ?? globalThis.chrome;

let currentTooltip = null;
let selectedText = '';
let themeSetting = 'system';

const getSelectedText = () => window.getSelection().toString().trim();

// --- Theme awareness ---

function resolveTheme(setting) {
  if (setting === 'dark' || setting === 'light') return setting;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

(async function loadTheme() {
  const store = await api.storage.local.get('theme');
  themeSetting = store.theme || 'system';
})();

api.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.theme) {
    themeSetting = changes.theme.newValue || 'system';
    if (currentTooltip) {
      currentTooltip.classList.toggle('dark-theme', resolveTheme(themeSetting) === 'dark');
    }
  }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (themeSetting === 'system' && currentTooltip) {
    currentTooltip.classList.toggle('dark-theme', resolveTheme('system') === 'dark');
  }
});

// --- Tooltip helpers ---

function applyTheme(tooltip) {
  if (resolveTheme(themeSetting) === 'dark') tooltip.classList.add('dark-theme');
}

function positionTooltip(tooltip, rect) {
  tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  document.body.appendChild(tooltip);

  const tooltipRect = tooltip.getBoundingClientRect();
  if (tooltipRect.right > window.innerWidth - 8) {
    tooltip.style.left = `${window.innerWidth - tooltipRect.width - 8 + window.scrollX}px`;
  }
}

// --- Tooltip rendering ---

function createTooltip(entry, rect, stemInfo) {
  removeTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'dict-ext-tooltip';
  applyTheme(tooltip);

  // Stem notice
  if (stemInfo) {
    const notice = document.createElement('div');
    notice.className = 'dict-ext-stem-notice';
    notice.textContent = stemInfo.from + ' \u2192 ' + stemInfo.to;
    tooltip.appendChild(notice);
  }

  // Word + part of speech header
  const header = document.createElement('div');
  header.className = 'dict-ext-header';

  const word = document.createElement('span');
  word.className = 'dict-ext-word';
  word.textContent = entry.word;
  header.appendChild(word);

  if (entry.meanings[0]) {
    const pos = document.createElement('span');
    pos.className = 'dict-ext-pos';
    pos.textContent = entry.meanings[0].speech_part;
    header.appendChild(pos);
  }

  tooltip.appendChild(header);

  // IPA + speak button
  if (entry.ipa) {
    const pronRow = document.createElement('div');
    pronRow.className = 'dict-ext-pronunciation';

    const ipaSpan = document.createElement('span');
    ipaSpan.className = 'dict-ext-ipa';
    ipaSpan.textContent = entry.ipa;
    pronRow.appendChild(ipaSpan);

    if (typeof speechSynthesis !== 'undefined') {
      const speakBtn = document.createElement('button');
      speakBtn.className = 'dict-ext-speak-btn';
      speakBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
      speakBtn.title = 'Listen';
      speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(entry.word);
        utt.lang = 'en-US';
        utt.rate = 0.85;
        speechSynthesis.speak(utt);
      });
      pronRow.appendChild(speakBtn);
    }

    tooltip.appendChild(pronRow);
  }

  // Etymology (truncated for tooltip compactness)
  if (entry.etymology) {
    const etymDiv = document.createElement('div');
    etymDiv.className = 'dict-ext-etymology';
    const text = entry.etymology.length > 150
      ? entry.etymology.slice(0, 148) + '\u2026'
      : entry.etymology;
    etymDiv.textContent = text;
    tooltip.appendChild(etymDiv);
  }

  // Definitions (max 3)
  const defs = document.createElement('ol');
  defs.className = 'dict-ext-defs';

  let count = 0;
  for (const meaning of entry.meanings) {
    if (count >= 3) break;
    const li = document.createElement('li');
    li.className = 'dict-ext-def';
    li.textContent = meaning.def;

    if (meaning.example) {
      const ex = document.createElement('div');
      ex.className = 'dict-ext-example';
      ex.textContent = `"${meaning.example}"`;
      li.appendChild(ex);
    }

    defs.appendChild(li);
    count++;
  }

  tooltip.appendChild(defs);

  // Footer link
  const footer = document.createElement('div');
  footer.className = 'dict-ext-footer';
  const link = document.createElement('a');
  link.href = `https://en.wiktionary.org/wiki/${entry.word}`;
  link.target = '_blank';
  link.textContent = 'More on Wiktionary \u2192';
  link.className = 'dict-ext-link';
  footer.appendChild(link);
  tooltip.appendChild(footer);

  positionTooltip(tooltip, rect);
  currentTooltip = tooltip;
}

function showSuggestionsTooltip(word, suggestions, rect) {
  removeTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'dict-ext-tooltip';
  applyTheme(tooltip);

  const msg = document.createElement('div');
  msg.className = 'dict-ext-notfound';
  msg.textContent = `"${word}" not found`;
  tooltip.appendChild(msg);

  if (suggestions.length > 0) {
    const container = document.createElement('div');
    container.className = 'dict-ext-suggestions';
    container.textContent = 'Similar: ';
    suggestions.forEach((s) => {
      const tag = document.createElement('span');
      tag.className = 'dict-ext-suggestion';
      tag.textContent = s;
      container.appendChild(tag);
    });
    tooltip.appendChild(container);
  }

  positionTooltip(tooltip, rect);
  currentTooltip = tooltip;
}

function showNotFound(word, rect) {
  removeTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'dict-ext-tooltip';
  applyTheme(tooltip);

  const msg = document.createElement('div');
  msg.className = 'dict-ext-notfound';
  msg.textContent = `"${word}" not found in dictionary`;
  tooltip.appendChild(msg);

  positionTooltip(tooltip, rect);
  currentTooltip = tooltip;
}

function removeTooltip() {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

// --- Event handlers ---

document.addEventListener('dblclick', async (e) => {
  const word = getSelectedText();
  if (!word || /\s/.test(word)) return;

  selectedText = word;

  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const rect = sel.getRangeAt(0).getBoundingClientRect();

  try {
    const response = await api.runtime.sendMessage({ action: 'lookup', word });
    if (response && response.entry) {
      const stemInfo = response.stemmedFrom
        ? { from: response.stemmedFrom, to: response.stemmedTo }
        : null;
      createTooltip(response.entry, rect, stemInfo);
    } else if (response && response.suggestions && response.suggestions.length > 0) {
      showSuggestionsTooltip(word, response.suggestions, rect);
    } else {
      showNotFound(word, rect);
    }
  } catch (err) {
    // Extension context may be invalid, silently fail
  }
});

document.addEventListener('click', (e) => {
  if (currentTooltip && !currentTooltip.contains(e.target)) {
    removeTooltip();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') removeTooltip();
});

document.addEventListener('scroll', removeTooltip, { passive: true });

// --- Popup messaging ---

api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.from === 'browserAction') {
    sendResponse({ keyword: selectedText || getSelectedText() });
  }
});
