function getDefinition(keyword) {
    var apiKey = "";
    var reqURL = "https://www.dictionaryapi.com/api/v3/references/collegiate/json/";
    reqURL += keyword;
    reqURL += "?key=" + apiKey; 

    // GET request
    var Http = new XMLHttpRequest();
    Http.open("GET", reqURL, true);
    Http.send(null);
    // handle response
    Http.onreadystatechange = function () {
        if (Http.readyState == 4 && Http.status == 200) {
            var resultText = document.getElementById("text-result");
            resultText.innerHTML = "";
            var responseJSON = JSON.parse(Http.responseText);
            results = responseJSON[0].def[0].sseq;
            results.forEach(function (item) {
                item.forEach(function (definition) {
                    definition.forEach(function (meaning) {
                        if (meaning.dt) {
                            console.log(meaning.dt[0][1]);
                            resultText.innertHTML += JSON.stringify(meaning.dt[0][1]);
                        }
                    });
                });
            });
        }
    }    

}

function handleResponse(message) {
    var keyWord = document.getElementById("keyword");
    if ((message.response).length > 0) {
        // change text in pop-up
        keyWord.innerHTML = message.response;
        getDefinition(message.response);
    }
}

function handleError(error) {
    console.log(`Error: ${error}`);
}

function notifyContentScript() {
    browser.tabs.query(
        {
            active: true,
            currentWindow: true
        },
        function (tabs) {
            var sender = browser.tabs.sendMessage(
            tabs[0].id,
            {
                from: "browserAction",
                msg : "getText"
            });
            sender.then(handleResponse, handleError);
        }
    );
}

notifyContentScript();
