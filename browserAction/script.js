// api call here
function getDefinition(keyword, callback) {
  const apiKey = '';
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
      return callback(response);
    }
    return callback(null);
  };
}


function handleDefinition(response) {
  if (!response.success) {
    resultText.innerHTML = response.data;
    return;
  }
  actualSearch = response.data[0].meta.id;
  // cache the new word now
  localStorage[actualSearch] = JSON.stringify(response);
  setDefinition(response);
}


function handleResponse(message) {
  let keyword = document.getElementById('keyword');
  let resultText = document.getElementById('text-result');
  let pos = document.getElementById('pos');

  let isKeywordValid = validateKeyword(message.keyword);

  if (message.keyword.length > 0 && isKeywordValid) {
    keyword.innerHTML = message.keyword;
    // check if word is already cached
    if (localStorage.getItem(message.keyword) === null) {
      getDefinition(message.keyword, handleDefinition);
    }
    else {
      // already cached = no need to 'getDefinition' from api
      setDefinition(JSON.parse(localStorage.getItem(message.keyword)));
    }
  }
  else {
    // when the user hasn't double clicked any word or sselected more than one word
    keyword.innerHTML = 'no/multiple words selected';
    pos.innerHTML = '';
    resultText.innerHTML = '';
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
