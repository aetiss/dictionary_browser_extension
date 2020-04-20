const LocalStorage = window.browser.storage.local;

// api call here
function getDefinition(keyword, callback) {
  const apiKey = config.API_KEY;
  const reqURL = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${keyword}?key=${apiKey}`;
  let response = {};
  // GET request
  const Http = new XMLHttpRequest();
  Http.open('GET', reqURL, true);
  Http.send(null);
  // handle response
  Http.onreadystatechange = () => {
    if (Http.readyState == 4 && Http.status == 200) {
      if (Http.responseText[0] === '[') {
        response = {
          success: true,
          data: JSON.parse(Http.responseText),
        };
      } else {
        response = {
          success: false,
          data: Http.responseText,
        };
      }
      return callback(response, keyword);
    }
  };
}

async function handleDefinition(response, keyword) {
  if (!response.success) {
    document.getElementById('keyword').innerHTML = 'Sorry';
    document.getElementById('pos').innerHTML = '';
    document.getElementById('text-result').innerHTML = response.data;
    return;
  }

  // check if word has homographs/multiple senses
  let hasHomograph = false;
  if (response.data[0].hasOwnProperty('hom')) hasHomograph = true;

  const newRecentWord = {
    originalSearch: keyword,
    actualSearch: response.data[0].meta.id,
    definition: response.data,
  };
  let store = {};
  store = await LocalStorage.get('recentWords');

  if (Object.keys('store').length === 0) {
    store = { recentWords: [] };
  }
  let foundIndex = store['recentWords'].findIndex(
    (word) => word.originalSearch === keyword,
  );
  if (foundIndex === -1) {
    store['recentWords'].push(newRecentWord);
    LocalStorage.set(store);
  }

  setDefinition(response.data, hasHomograph);
}

async function handleResponse(message) {
  let keyword = document.getElementById('keyword');
  let pos = document.getElementById('pos');
  let resultText = document.getElementById('text-result');

  let isKeywordValid = validateKeyword(message.keyword);

  if (message.keyword.length > 0 && isKeywordValid) {
    keyword.innerHTML = message.keyword;
    getDefinition(message.keyword, handleDefinition);
    let store = {};
    store = await LocalStorage.get('recentWords');
    if (Object.keys('store').length == 0) {
      store = { recentWords: [] };
    }
    console.log('store', store);
    let foundWord = null;

    store['recentWords'].forEach((word) => {
      if (word.originalSearch === message.keyword) {
        foundWord = word;
      }
    });
    // check if word is already cached
    if (!foundWord) {
      getDefinition(message.keyword, handleDefinition);
    } else {
      // already cached = no need to 'getDefinition' from api
      setDefinition(foundWord.definition);
    }
  } else {
    // when the user hasn't double clicked any word or selected more than one word
    keyword.innerHTML = 'Sorry';
    pos.innerHTML = '';
    resultText.innerHTML = '&nbsp&nbsp No/multiple words selected';
  }
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

(() => {
  browser.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    function (tabs) {
      var sender = browser.tabs.sendMessage(tabs[0].id, {
        from: 'browserAction',
        msg: 'getText',
      });
      sender.then(handleResponse, handleError);
    },
  );
})();
