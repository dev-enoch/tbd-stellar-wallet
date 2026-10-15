/**
 * In-Page Provider exposing window.stellar, window.freighter, and window.stellith
 * Conforming to SEP wallet standards and the Stellar Wallets Kit.
 */

const STELLITH_PROVIDER = {
  name: 'Stellith',
  version: '1.0.0',

  isConnected: async (): Promise<boolean> => {
    return new Promise((resolve) => {
      window.postMessage({ target: 'stellith-contentscript', type: 'IS_CONNECTED' }, '*');
      const listener = (event: MessageEvent) => {
        if (
          event.data &&
          (event.data.target === 'stellith-inpage' || event.data.target === 'tbd-inpage') &&
          event.data.type === 'IS_CONNECTED_RESPONSE'
        ) {
          window.removeEventListener('message', listener);
          resolve(!!event.data.connected);
        }
      };
      window.addEventListener('message', listener);
      setTimeout(() => {
        window.removeEventListener('message', listener);
        resolve(true);
      }, 500);
    });
  },

  isAllowed: async (): Promise<boolean> => {
    return true;
  },

  setAllowed: async (): Promise<boolean> => {
    return true;
  },

  getUserInfo: async (): Promise<{ publicKey: string }> => {
    const publicKey = await STELLITH_PROVIDER.getPublicKey();
    return { publicKey };
  },

  getPublicKey: async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      window.postMessage({ target: 'stellith-contentscript', type: 'GET_PUBLIC_KEY', id }, '*');

      const listener = (event: MessageEvent) => {
        if (
          event.data &&
          (event.data.target === 'stellith-inpage' || event.data.target === 'tbd-inpage') &&
          event.data.id === id
        ) {
          window.removeEventListener('message', listener);
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.publicKey);
        }
      };
      window.addEventListener('message', listener);
    });
  },

  getNetwork: async (): Promise<string> => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(7);
      window.postMessage({ target: 'stellith-contentscript', type: 'GET_NETWORK', id }, '*');

      const listener = (event: MessageEvent) => {
        if (
          event.data &&
          (event.data.target === 'stellith-inpage' || event.data.target === 'tbd-inpage') &&
          event.data.id === id
        ) {
          window.removeEventListener('message', listener);
          resolve(event.data.network || 'TESTNET');
        }
      };
      window.addEventListener('message', listener);
      setTimeout(() => {
        window.removeEventListener('message', listener);
        resolve('TESTNET');
      }, 500);
    });
  },

  getNetworkDetails: async (): Promise<{ network: string; networkUrl: string; networkPassphrase: string }> => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(7);
      window.postMessage({ target: 'stellith-contentscript', type: 'GET_NETWORK', id }, '*');

      const listener = (event: MessageEvent) => {
        if (
          event.data &&
          (event.data.target === 'stellith-inpage' || event.data.target === 'tbd-inpage') &&
          event.data.id === id
        ) {
          window.removeEventListener('message', listener);
          resolve({
            network: event.data.network || 'TESTNET',
            networkUrl: event.data.networkUrl || 'https://horizon-testnet.stellar.org',
            networkPassphrase: event.data.networkPassphrase || 'Test SDF Network ; September 2015',
          });
        }
      };
      window.addEventListener('message', listener);
      setTimeout(() => {
        window.removeEventListener('message', listener);
        resolve({
          network: 'TESTNET',
          networkUrl: 'https://horizon-testnet.stellar.org',
          networkPassphrase: 'Test SDF Network ; September 2015',
        });
      }, 500);
    });
  },

  signTransaction: async (xdr: string, opts?: { network?: string; networkPassphrase?: string }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      window.postMessage({ target: 'stellith-contentscript', type: 'SIGN_TRANSACTION', xdr, opts, id }, '*');

      const listener = (event: MessageEvent) => {
        if (
          event.data &&
          (event.data.target === 'stellith-inpage' || event.data.target === 'tbd-inpage') &&
          event.data.id === id
        ) {
          window.removeEventListener('message', listener);
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.signedXdr);
        }
      };
      window.addEventListener('message', listener);
    });
  },

  signAuthEntry: async (entryXdr: string, opts?: any): Promise<string> => {
    return STELLITH_PROVIDER.signTransaction(entryXdr, opts);
  },
};

// Mount to global window namespace
(window as any).stellar = STELLITH_PROVIDER;
(window as any).freighter = STELLITH_PROVIDER;
(window as any).stellith = STELLITH_PROVIDER;
(window as any).stellithWallet = STELLITH_PROVIDER;
(window as any).tbdWallet = STELLITH_PROVIDER;

// Dispatch discovery events for dApps listening for injected providers
if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
  try {
    window.dispatchEvent(new CustomEvent('stellar:provider:ready', { detail: STELLITH_PROVIDER }));
    window.dispatchEvent(new CustomEvent('stellith#initialized', { detail: STELLITH_PROVIDER }));
  } catch (e) {
    console.warn('Stellith provider dispatch notice:', e);
  }
}

export {};
