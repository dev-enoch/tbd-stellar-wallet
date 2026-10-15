/**
 * Chrome Extension Content Script:
 * Relays messages between in-page provider and extension background service worker.
 */

window.addEventListener('message', async (event) => {
  if (event.source !== window || !event.data || event.data.target !== 'tbd-contentscript') {
    return;
  }

  const { type, id, xdr, opts } = event.data;

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage(
      { type, id, xdr, opts, origin: window.location.origin },
      (response) => {
        window.postMessage(
          {
            target: 'tbd-inpage',
            id,
            type: `${type}_RESPONSE`,
            ...response,
          },
          '*'
        );
      }
    );
  }
});
export {};
