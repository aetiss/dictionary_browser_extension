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
    setMsg(response.data);
    return;
  }

  // check if word has homographs/multiple senses
  let hasHomograph = false;
  if (response.data[0].hasOwnProperty('hom')) hasHomograph = true;

  const newRecentWord = {
    originalSearch: keyword.toLowerCase(),
    actualSearch: response.data[0].meta.id,
    definition: response.data,
    hasHomograph: hasHomograph,
  };

  // add new word and its definition to cache
  let store = await LocalStorage.get('recentWords');
  store['recentWords'].push(newRecentWord);
  LocalStorage.set(store);
  console.log('after caching', store);
  setDefinition(response.data, hasHomograph);
}

async function handleResponse(message) {
  let keyword = document.getElementById('keyword');

  let isKeywordValid = validateKeyword(message.keyword);

  if (message.keyword.length > 0 && isKeywordValid) {
    keyword.innerHTML = message.keyword;
    let store = await LocalStorage.get('recentWords');
    if (Object.keys(store).length == 0) {
      store = { recentWords: [] };
      LocalStorage.set(store);
    }
    console.log('initial store', store);
    // checking for 'keyword' in recentWords
    let foundWord = null;
    store['recentWords'].forEach((word) => {
      if (word.originalSearch === message.keyword.toLowerCase()) {
        foundWord = word;
      }
    });
    // check if word is already cached
    if (!foundWord) {
      // not cached = getDefinition API call
      getDefinition(message.keyword, handleDefinition);
    } else {
      // already cached = no need to 'getDefinition' from api
      setDefinition(foundWord.definition, foundWord.hasHomograph);
    }
  } else {
    // when the user hasn't double clicked any word or selected more than one word
    setMsg('&nbsp&nbsp No/multiple words selected');
  }
}

function setMsg(errMsg) {
  document.getElementById('keyword').innerHTML = 'Sorry';
  document.getElementById('pos').innerHTML = '';
  document.getElementById('text-result').innerHTML = errMsg;
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
