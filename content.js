const selectText = () => window.getSelection().toString().trim();

const getSelectedText = () => {
  let selectedText = '';
  if (window.getSelection || document.getSelection) {
    selectedText = selectText();
  } else if (document.selection) {
    selectedText = document.selection.createRange().text;
  }
  return selectedText;
};

const handleMessage = (request, sender, sendResponse) => {
  if (request.from == 'browserAction') {
    selectedText = getSelectedText();
    sendResponse({
      keyword: selectedText,
    });
  }
};

var selectedText = '';
document.ondblclick = getSelectedText;
browser.runtime.onMessage.addListener(handleMessage);
