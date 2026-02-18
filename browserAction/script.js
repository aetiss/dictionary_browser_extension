const api = globalThis.browser ?? globalThis.chrome;
const LocalStorage = api.storage.local;

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
      api.tabs.sendMessage(tabs[0].id, msg, handleSelection);
    }
  });
};

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
    setDefinition(cached.definition);
    return;
  }

  // Ask background service worker for lookup
  try {
    const response = await api.runtime.sendMessage({ action: 'lookup', word: keyword });
    if (response && response.entry) {
      await setCache(keyword, response.entry);
      setDefinition(response.entry);
    } else {
      setMsg('Word not found');
    }
  } catch (err) {
    setMsg('Error loading dictionary');
  }
}
