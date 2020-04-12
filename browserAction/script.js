function getDefinition(keyword, callback) {
  const apiKey = '';
  const reqURL = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${keyword}?key=${apiKey}`;

  let data = {};
  // GET request
  const Http = new XMLHttpRequest();
  Http.open('GET', reqURL, true);
  Http.send(null);
  // handle response
  Http.onreadystatechange = () => {
    if (Http.readyState == 4 && Http.status == 200) {
      if (Http.responseText[0] === '[') {
        data = {
          success: true,
          data: JSON.parse(Http.responseText),
        };
      } else {
        data = {
          success: false,
          data: Http.responseText,
        };
      }
      return callback(data);
    }
    return callback(null);
  };
}

function formatMeaning(meaning) {
  meaning = meaning.replace(/{bc}/g, '');
  meaning = meaning.replace(/{ldquo}/g, '"');
  meaning = meaning.replace(/{rdquo}/g, '"');
  meaning = meaning.replace(/{b}/g, '<b>');
  meaning = meaning.replace(/{\/b}/g, '</b>');
  meaning = meaning.replace(/{inf}/g, '<sub>');
  meaning = meaning.replace(/{\/inf}/g, '</sub>');
  meaning = meaning.replace(/{sup}/g, '<sup>');
  meaning = meaning.replace(/{\/sup}/g, '</sup>');
  meaning = meaning.replace(/{it}/g, '<i>');
  meaning = meaning.replace(/{\/it}/g, '</i>');

  return meaning;
}

function handleResponse(message) {
  let keyword = document.getElementById('keyword');
  let resultText = document.getElementById('text-result');
  if (message.response.length > 0) {
    keyword.innerHTML = message.response;
    getDefinition(message.response, (data) => {
      resultText.innerHTML = '';
      if (!data.success) {
        resultText.innerHTML = data.data;
        return;
      }
      results = data.data[0].def[0].sseq;
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
