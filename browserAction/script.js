const LocalStorage = window.browser.storage.local;

// api call here
function getDefinition(keyword, handleDefinition) {
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
      return handleDefinition(keyword, response);
    }
  };
}

async function handleDefinition(keyword, response) {
  if (!response.success) {
    setMsg(response.data);
    return;
  }
  // check if word has homographs/multiple senses
  let hasHomograph = false;
  if (response.data[0].hasOwnProperty('hom')) hasHomograph = true;
  await setCache(keyword, response.data, hasHomograph);
  setDefinition(response.data, hasHomograph);
}

async function handleResponse(message) {
  let keyword = document.getElementById('keyword');

  let isKeywordValid = validateKeyword(message.keyword);

  if (message.keyword.length > 0 && isKeywordValid) {
    keyword.innerHTML = message.keyword;
    let foundWord = await checkCache(message.keyword);
    // set definition if cache returned not null
    if (foundWord) setDefinition(foundWord.definition, foundWord.hasHomograph);
    else getDefinition(message.keyword, handleDefinition);

  } else {
    // invalid or no keyword selected
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
