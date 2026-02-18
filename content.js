const api = globalThis.browser ?? globalThis.chrome;

let currentTooltip = null;
let selectedText = '';

const getSelectedText = () => window.getSelection().toString().trim();

// --- Tooltip rendering ---

function createTooltip(entry, rect) {
  removeTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'dict-ext-tooltip';

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

  // Position tooltip
  const top = rect.bottom + window.scrollY + 6;
  let left = rect.left + window.scrollX;
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;

  document.body.appendChild(tooltip);

  // Adjust if overflowing right edge
  const tooltipRect = tooltip.getBoundingClientRect();
  if (tooltipRect.right > window.innerWidth - 8) {
    tooltip.style.left = `${window.innerWidth - tooltipRect.width - 8 + window.scrollX}px`;
  }

  currentTooltip = tooltip;
}

function showNotFound(word, rect) {
  removeTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'dict-ext-tooltip';

  const msg = document.createElement('div');
  msg.className = 'dict-ext-notfound';
  msg.textContent = `"${word}" not found in dictionary`;
  tooltip.appendChild(msg);

  const top = rect.bottom + window.scrollY + 6;
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${rect.left + window.scrollX}px`;

  document.body.appendChild(tooltip);
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
      createTooltip(response.entry, rect);
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

// --- Popup messaging (backward compat) ---

api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.from === 'browserAction') {
    sendResponse({ keyword: selectedText || getSelectedText() });
  }
});
