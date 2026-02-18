const api = globalThis.browser ?? globalThis.chrome;

const _letterCache = {};

function getLetterFile(word) {
  const first = word.charAt(0).toLowerCase();
  if (first >= 'a' && first <= 'z') return first;
  return 'misc';
}

async function loadLetterData(letter) {
  if (_letterCache[letter]) return _letterCache[letter];
  const url = api.runtime.getURL(`data/${letter}.json`);
  const response = await fetch(url);
  const data = await response.json();
  _letterCache[letter] = data;
  return data;
}

async function lookupWord(word) {
  const normalized = word.toLowerCase().trim();
  if (!normalized || /\s/.test(normalized)) return null;
  const letter = getLetterFile(normalized);
  const data = await loadLetterData(letter);
  return data[normalized] || null;
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'lookup' && message.word) {
    lookupWord(message.word).then((entry) => {
      sendResponse({ entry });
    });
    return true; // keep channel open for async response
  }
});
