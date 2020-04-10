function handleMessage(request, sender, sendResponse) {
  sendResponse({
    response: 'Response from background script' + request.selectedText,
  });
}

browser.runtime.onMessage.addListener(handleMessage);
