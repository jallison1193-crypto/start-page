// Tell the start page the helper is installed, then pass its requests to the background script
document.documentElement.dataset.browserosHelper = '1';
window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.type !== 'start-page:open') return;
  chrome.runtime.sendMessage({ route: e.data.route });
});
