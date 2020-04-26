class storage {
  constructor() {
    this.LocalStorage = window.browser.storage.local;
  }
  async getData() {
    let store = {};
    store = await LocalStorage.get('recentWords');
  }
  setData(data) {}
}
