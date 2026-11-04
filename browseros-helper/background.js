// BrowserOS blocks websites from opening its pages, but an extension may open them
const BASE = 'chrome-extension://bflpfmnmnokmjhmgnolecpppdbdophmk/app.html#/';
const ROUTES = new Set(['home', 'scheduled', 'connect-apps', 'settings/ai']);

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!ROUTES.has(msg?.route) || !sender.tab) return;
  chrome.tabs.update(sender.tab.id, { url: BASE + msg.route });
});
