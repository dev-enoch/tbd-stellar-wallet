/**
 * Chrome Extension Content Script:
 * Injects inpage.js into host page DOM and bridges messages
 * between in-page Stellith provider and background service worker.
 */

function injectScript(filePath: string) {
  try {
    const container = document.head || document.documentElement;
    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', chrome.runtime.getURL(filePath));
    container.insertBefore(script, container.firstChild);
    script.onload = () => {
      script.remove();
    };
  } catch (error) {
    console.error('Stellith Wallet: failed to inject inpage script', error);
  }
}

if (typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function') {
  injectScript('inpage.js');
}

window.addEventListener('message', async (event) => {
  if (
    event.source !== window ||
    !event.data ||
    (event.data.target !== 'tbd-contentscript' && event.data.target !== 'stellith-contentscript')
  ) {
    return;
  }

  const { type, id, xdr, opts } = event.data;

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage(
      { type, id, xdr, opts, origin: window.location.origin },
      (response) => {
        window.postMessage(
          {
            target: 'stellith-inpage',
            id,
            type: `${type}_RESPONSE`,
            ...response,
          },
          '*'
        );
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
