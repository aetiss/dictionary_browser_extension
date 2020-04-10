function handleResponse(message) {
    var keyWord = document.getElementById("keyword");
    if ((message.response).length > 0) {
        // change text in pop-up
        keyWord.innerHTML = message.response;
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
