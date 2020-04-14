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

function handleResponse(message) {
  let keyword    = document.getElementById('keyword');
  let resultText = document.getElementById('text-result');
  let pos = document.getElementById('pos');

  let isKeywordValid = validateKeyword(message.keyword);

  if (message.keyword.length > 0 && isKeywordValid) {
    keyword.innerHTML = message.keyword;
    getDefinition(message.keyword, (response) => {
      resultText.innerHTML = '';
      if (!response.success) {
        resultText.innerHTML = response.data;
        return;
      }
      results = response.data[0].def[0].sseq;
      actualSearch = response.data[0].meta.id;
      partOfSpeech = response.data[0].fl; // functinal label
      keyword.innerHTML = actualSearch;
      pos.innerHTML     = partOfSpeech;
      
      let ol = document.createElement('ol');
      results.forEach((item) => {
        item.forEach((definition) => {
          definition.forEach((meaning) => {
            if (meaning.dt) {
              let li = document.createElement('li');
              ol.appendChild(li);
              let formattedMeaning = formatMeaning(meaning.dt[0][1]);
              li.innerHTML += formattedMeaning;
            }
          });
        });
      });
      resultText.appendChild(ol);
    });
  }
  else {
    // when the user hasn't double clicked any word
    keyword.innerHTML    = 'please select a word';
    pos.innerHTML        = '';
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
