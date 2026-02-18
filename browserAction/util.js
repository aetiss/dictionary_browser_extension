const hasWhiteSpace = (word) => /\s/g.test(word);

const validateKeyword = (keyword) => !hasWhiteSpace(keyword);

async function checkCache(keyword) {
  let store = await LocalStorage.get('recentWords');
  if (!store.recentWords) {
    store = { recentWords: [] };
    LocalStorage.set(store);
  }
  let foundWord = null;
  store.recentWords.some((word) => {
    if (word.originalSearch === keyword.toLowerCase()) {
      foundWord = word;
      return true;
    }
  });
  return foundWord;
}

async function setCache(keyword, entry) {
  const newRecentWord = {
    originalSearch: keyword.toLowerCase(),
    definition: entry,
  };
  let store = await LocalStorage.get('recentWords');
  if (!store.recentWords) store.recentWords = [];
  if (store.recentWords.length >= 20) store.recentWords.pop();
  store.recentWords.unshift(newRecentWord);
  LocalStorage.set(store);
}

function setDefinition(entry) {
  const resultEl = document.getElementById('result');
  const emptyEl = document.getElementById('empty-state');
  const errorEl = document.getElementById('error-state');
  const keywordEl = document.getElementById('keyword');
  const posEl = document.getElementById('pos');
  const resultText = document.getElementById('text-result');
  const sourceLink = document.getElementById('source-link');

  // Show result, hide empty/error
  resultEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  errorEl.classList.add('hidden');

  // Word
  keywordEl.textContent = entry.word;

  // First part of speech
  posEl.textContent = entry.meanings[0] ? entry.meanings[0].speech_part : '';

  // Source link
  sourceLink.setAttribute('href', `https://en.wiktionary.org/wiki/${entry.word}`);

  // Group meanings by speech_part
  const grouped = {};
  entry.meanings.forEach((m) => {
    const part = m.speech_part || 'other';
    if (!grouped[part]) grouped[part] = [];
    grouped[part].push(m);
  });

  // Render
  resultText.innerHTML = '';

  for (const [speechPart, meanings] of Object.entries(grouped)) {
    const posLabel = document.createElement('div');
    posLabel.className = 'section-pos';
    posLabel.textContent = speechPart;
    resultText.appendChild(posLabel);

    const ol = document.createElement('ol');
    ol.className = 'def-list';
    meanings.forEach((meaning) => {
      const li = document.createElement('li');
      li.textContent = meaning.def;

      if (meaning.example) {
        const example = document.createElement('div');
        example.className = 'example';
        example.textContent = `"${meaning.example}"`;
        li.appendChild(example);
      }

      ol.appendChild(li);
    });
    resultText.appendChild(ol);

    // Synonyms
    const allSynonyms = meanings.flatMap((m) => m.synonyms || []);
    const uniqueSynonyms = [...new Set(allSynonyms)];
    if (uniqueSynonyms.length > 0) {
      const synDiv = document.createElement('div');
      synDiv.className = 'synonyms';
      synDiv.textContent = 'Synonyms: ' + uniqueSynonyms.join(', ');
      resultText.appendChild(synDiv);
    }
  }
}

function setMsg(msg) {
  const resultEl = document.getElementById('result');
  const emptyEl = document.getElementById('empty-state');
  const errorEl = document.getElementById('error-state');

  resultEl.classList.add('hidden');
  emptyEl.classList.add('hidden');
  errorEl.classList.remove('hidden');
  errorEl.textContent = msg;
}
