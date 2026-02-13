chrome.runtime.onInstalled.addListener(() => {
  console.log('FocusFuel extension installed');
  chrome.storage.local.set({ installDate: new Date().toISOString() });
});

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
});