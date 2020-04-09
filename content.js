function getSelectedText() {
    var selectedText = "";
    if (window.getSelection) {
        selectedText = window.getSelection().toString();
    } 
    selectedText = selectedText.trim();
    return selectedText;
}


