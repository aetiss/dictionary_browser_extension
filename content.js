function getSelectedText() {
    var selectedText = "";
    if (typeof window.getSelection != "undefined") {
        selectedText = window.getSelection().toString();
    } 
    return selectedText;
}

function handleMessage(request, sender, sendResponse) {
    if (request.from == "browserAction") {
        var selectedText = getSelectedText();
        sendResponse({
            response: selectedText,
        });
    }
}

document.ondblclick = getSelectedText;
browser.runtime.onMessage.addListener(handleMessage);
