browser.browserAction.onClicked.addListner( () => {
    console.log("hello console");
    var msg = browser.tabs.sendMessage(tabs[0].id,"message from pop");
    console.log(msg);
});

