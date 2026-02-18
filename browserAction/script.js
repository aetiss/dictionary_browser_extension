// --- Theme init (runs immediately, before DOM renders) ---
function resolveTheme(setting) {
  if (setting === 'dark' || setting === 'light') return setting;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

(async function initTheme() {
  const store = await LocalStorage.get('theme');
  document.documentElement.setAttribute('data-theme', resolveTheme(store.theme || 'system'));
})();

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
  const store = await LocalStorage.get('theme');
  if (!store.theme || store.theme === 'system') {
    document.documentElement.setAttribute('data-theme', resolveTheme('system'));
  }
});

const searchInput = document.getElementById('search');

window.onload = function () {
  const optionsLink = api.runtime.getURL('options/options.html');
  document.getElementById('optionsPage').setAttribute('href', optionsLink);

  // Try to get selected word from the active tab
  api.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs[0]) return;
    const msg = { from: 'browserAction', msg: 'getText' };

    const handleSelection = (message) => {
      if (message && message.keyword && message.keyword.length > 0) {
        searchInput.value = message.keyword;
        searchWord(message.keyword);
      }
    };

    if (globalThis.browser) {
      api.tabs.sendMessage(tabs[0].id, msg).then(handleSelection, () => {});
    } else {
      api.tabs.sendMessage(tabs[0].id, msg, (response) => {
        if (api.runtime.lastError) return; // content script not available
        handleSelection(response);
      });
    }
  });
};

// --- Pronunciation (Web Speech API) ---
if (typeof speechSynthesis !== 'undefined') {
  document.getElementById('speak-btn').addEventListener('click', function () {
    const word = this.dataset.word;
    if (!word) return;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'en-US';
    utt.rate = 0.85;
    this.classList.add('speaking');
    utt.onend = () => this.classList.remove('speaking');
    utt.onerror = () => this.classList.remove('speaking');
    speechSynthesis.speak(utt);
  });
}

// Search on Enter
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const word = searchInput.value.trim();
    if (word) searchWord(word);
  }
});

async function searchWord(keyword) {
  const isValid = validateKeyword(keyword);
  if (!isValid) {
    setMsg('Enter a single word');
    return;
  }

  // Check LRU cache first
  const cached = await checkCache(keyword);
  if (cached) {
    setDefinition(cached.definition, cached.stemInfo);
    return;
  }

  // Ask background service worker for lookup
  try {
    const response = await api.runtime.sendMessage({ action: 'lookup', word: keyword });
    if (response && response.entry) {
      const stemInfo = response.stemmedFrom
        ? { from: response.stemmedFrom, to: response.stemmedTo }
        : null;
      await setCache(keyword, response.entry, stemInfo);
      setDefinition(response.entry, stemInfo);
    } else if (response && response.suggestions && response.suggestions.length > 0) {
      showSuggestions(keyword, response.suggestions);
    } else {
      setMsg('Word not found');
    }
  } catch (err) {
    setMsg('Error loading dictionary');
  }
}

function showSuggestions(word, suggestions) {
  const resultEl = document.getElementById('result');
  const emptyEl = document.getElementById('empty-state');
  const errorEl = document.getElementById('error-state');

  resultEl.classList.add('hidden');
  emptyEl.classList.add('hidden');
  errorEl.classList.remove('hidden');

  errorEl.innerHTML = '';
  const msg = document.createElement('div');
  msg.textContent = `"${word}" not found. Did you mean:`;
  errorEl.appendChild(msg);

  const list = document.createElement('div');
  list.className = 'suggestions';
  suggestions.forEach((s) => {
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'suggestion-link';
    link.textContent = s;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      searchInput.value = s;
      searchWord(s);
    });
    list.appendChild(link);
  });
  errorEl.appendChild(list);
}
