function getSelectedText() {
    if (window.getSelection) {
        selectedText = window.getSelection().toString();
    } else if (document.getSelection) {
        selectedText = document.getSelection().toString();
    } else if (document.selection) {
        selectedText = document.selection.createRange().text;
    }

    return selectedText;
}

function handleMessage(request, sender, sendResponse) {
    if (request.from == 'browserAction') {
        selectedText = getSelectedText();
        sendResponse({
            keyword: selectedText,
        });
    }
}

var selectedText = ''
document.ondblclick = getSelectedText;
browser.runtime.onMessage.addListener(handleMessage);
