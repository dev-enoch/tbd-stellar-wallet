/**
 * In-Page Provider exposing window.stellar and window.freighter API
 * Conforming to SEP wallet standards and the Stellar Wallets Kit.
 */

const TBD_PROVIDER = {
  isConnected: async (): Promise<boolean> => {
    return new Promise((resolve) => {
      window.postMessage({ target: 'tbd-contentscript', type: 'IS_CONNECTED' }, '*');
      const listener = (event: MessageEvent) => {
        if (event.data && event.data.target === 'tbd-inpage' && event.data.type === 'IS_CONNECTED_RESPONSE') {
          window.removeEventListener('message', listener);
          resolve(!!event.data.connected);
        }
      };
      window.addEventListener('message', listener);
    });
  },

  getPublicKey: async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      window.postMessage({ target: 'tbd-contentscript', type: 'GET_PUBLIC_KEY', id }, '*');

      const listener = (event: MessageEvent) => {
        if (event.data && event.data.target === 'tbd-inpage' && event.data.id === id) {
          window.removeEventListener('message', listener);
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.publicKey);
        }
      };
      window.addEventListener('message', listener);
    });
  },

  getNetwork: async (): Promise<string> => {
    return 'TESTNET';
  },

  signTransaction: async (xdr: string, opts?: { network?: string; networkPassphrase?: string }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      window.postMessage({ target: 'tbd-contentscript', type: 'SIGN_TRANSACTION', xdr, opts, id }, '*');

      const listener = (event: MessageEvent) => {
        if (event.data && event.data.target === 'tbd-inpage' && event.data.id === id) {
          window.removeEventListener('message', listener);
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.signedXdr);
        }
      };
      window.addEventListener('message', listener);
    });
  },
};

(window as any).stellar = TBD_PROVIDER;
(window as any).freighter = TBD_PROVIDER;
(window as any).stellith = TBD_PROVIDER;
(window as any).stellithWallet = TBD_PROVIDER;
(window as any).tbdWallet = TBD_PROVIDER;
export {};
