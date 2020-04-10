function getSelectedText() {
    var selectedText = "";
    if (typeof window.getSelection != "undefined") {
        selectedText = window.getSelection().toString();
    } 
    return selectedText;
}


document.onmouseup = getSelectedText;

browser.runtime.onMessage.addListener( 
    (message, sender, sendResponse) => {
        console.log(message);
        return getSelectedText; 
});
