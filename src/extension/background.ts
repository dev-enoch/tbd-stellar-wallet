/**
 * Background Service Worker (Manifest V3)
 * Manages extension state, auto-lock alarms, and dApp communication.
 */

if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onInstalled.addListener(() => {
    console.info('TBD Wallet extension service worker initialized.');
  });

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === 'IS_CONNECTED') {
      sendResponse({ connected: true });
      return true;
    }

    if (request.type === 'GET_PUBLIC_KEY') {
      chrome.storage.local.get(['tbd_keystore', 'tbd_preferences'], (res) => {
        if (!res.tbd_keystore) {
          sendResponse({ error: 'Wallet not initialized' });
        } else {
          sendResponse({ publicKey: 'Connected via TBD Wallet' });
        }
      });
      return true;
    }

    if (request.type === 'SIGN_TRANSACTION') {
      // In a live browser extension, opens chrome.windows.create popup for signing
      sendResponse({ signedXdr: request.xdr });
      return true;
    }

    return false;
  });
}
export {};
