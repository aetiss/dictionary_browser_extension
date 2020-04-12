function getDefinition(keyword, callback) {
  const apiKey = '';
  const reqURL = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${keyword}?key=${apiKey}`;
  // GET request
  const Http = new XMLHttpRequest();
  Http.open('GET', reqURL, true);
  Http.send(null);
  // handle response
  Http.onreadystatechange = () => {
    if (Http.readyState == 4 && Http.status == 200) {
      const data = JSON.parse(Http.responseText);
      callback(data);
    }
  };
}

function handleResponse(message) {
  let keyword = document.getElementById('keyword');
  let resultText = document.getElementById('text-result');
  if (message.response.length > 0) {
    keyword.innerHTML = message.response;
    resultText.innerHTML = '';

    getDefinition(message.response, (responseJSON) => {
      results = responseJSON[0].def[0].sseq;
      let ol = document.createElement('ol');
      results.forEach((item) => {
        let definitionText = item[0][1]['dt'][0][1];
        let li = document.createElement('li');
        ol.appendChild(li);
        li.innerHTML += definitionText;
      });
      resultText.appendChild(ol);
    });
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
