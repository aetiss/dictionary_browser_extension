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

function handleDefinition(response, keyword) {
  if (!response.success) {
    document.getElementById('keyword').innerHTML = 'Sorry';
    document.getElementById('pos').innerHTML = '';
    document.getElementById('text-result').innerHTML = response.data;
    return;
  }

  // check if word has homographs/multiple senses
  let hasHomograph = false;
  if (response.data[0].hasOwnProperty('hom'))
    hasHomograph = true;

  // actualSearch = response.data[0].meta.id;
  // cache the new word now
  // localStorage.setItem(actualSearch, JSON.stringify(response));
  // localStorage.setItem(keyword, JSON.stringify(response));
  setDefinition(response.data, hasHomograph);
}

function handleResponse(message) {
  let keyword = document.getElementById('keyword');
  let pos = document.getElementById('pos');
  let resultText = document.getElementById('text-result');

  let isKeywordValid = validateKeyword(message.keyword);

  if (message.keyword.length > 0 && isKeywordValid) {
    keyword.innerHTML = message.keyword;
    getDefinition(message.keyword, handleDefinition);
    // check if word is already cached
    //   if (!localStorage.getItem(message.keyword)) {
    //     getDefinition(message.keyword, handleDefinition);
    //   } else {
    //     // already cached = no need to 'getDefinition' from api
    //     setDefinition(JSON.parse(localStorage.getItem(message.keyword)));
    //   }
  } else {
    // when the user hasn't double clicked any word or sselected more than one word
    keyword.innerHTML = 'Sorry';
    pos.innerHTML = '';
    resultText.innerHTML = '&nbsp&nbspno/multiple words selected';
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
