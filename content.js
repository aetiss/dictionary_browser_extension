document.ondblclick = function () {
  const selectedText = window.getSelection && window.getSelection().toString();
  console.log(selectedText);
};
