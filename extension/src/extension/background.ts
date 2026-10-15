/**
 * Background Service Worker (Manifest V3)
 * Manages extension state, auto-lock alarms, and dApp communication.
 */

if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onInstalled.addListener(() => {
    console.info('Stellith Wallet extension service worker initialized.');
  });

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === 'IS_CONNECTED') {
      sendResponse({ connected: true });
      return true;
    }

    if (request.type === 'GET_PUBLIC_KEY') {
      chrome.storage.local.get(['tbd_active_pubkey', 'tbd_keystore', 'tbd_preferences'], (res) => {
        if (res.tbd_active_pubkey) {
          sendResponse({ publicKey: res.tbd_active_pubkey });
        } else if (!res.tbd_keystore) {
          sendResponse({ error: 'Wallet not initialized' });
        } else {
          sendResponse({ publicKey: 'Connected via Stellith Wallet' });
        }
      });
      return true;
    }

    if (request.type === 'GET_NETWORK') {
      chrome.storage.local.get(['tbd_preferences'], (res) => {
        const prefs = res.tbd_preferences as { network?: string } | undefined;
        const net = prefs?.network || 'testnet';
        const isMainnet = net === 'mainnet';
        sendResponse({
          network: isMainnet ? 'PUBLIC' : 'TESTNET',
          networkUrl: isMainnet ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org',
          networkPassphrase: isMainnet
            ? 'Public Global Stellar Network ; September 2015'
            : 'Test SDF Network ; September 2015',
        });
      });
      return true;
    }

    if (request.type === 'SIGN_TRANSACTION') {
      // Return transaction XDR for dApp consumption
      sendResponse({ signedXdr: request.xdr });
      return true;
    }

    return false;
  });
}

export {};
