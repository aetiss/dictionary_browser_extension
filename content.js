function handleResponse(message) {
  console.log(`Message from the background script:  ${message.response}`);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

function notifyBackgroundPage(selectedText) {
  var sending = browser.runtime.sendMessage({
    selectedText: selectedText,
  });
  sending.then(handleResponse, handleError);
}

document.ondblclick = function (e) {
  const selectedText = window.getSelection && window.getSelection().toString();
  console.log(selectedText);

  notifyBackgroundPage(selectedText);
};
