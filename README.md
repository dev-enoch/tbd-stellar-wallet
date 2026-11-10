# Stellith (tbd-stellar-wallet)

A non-custodial browser extension wallet for the Stellar network. Keys are created and kept inside the extension, never on a server.

The working name is TBD. The extension registers as Stellith.

## Features

- Create a wallet from a BIP39 seed, or import an existing mnemonic
- Multiple accounts per wallet, with an account switcher
- Send and receive XLM and issued assets, with QR codes for addresses
- Manage trustlines and assets
- Swap through Stellar path payments, quoting against the Stellar DEX with price impact, minimum received and route
- Passkey accounts: create a smart account backed by a WebAuthn passkey, with sponsored fee operations and a daily cap of five
- Ledger signing over WebHID
- dApp provider that injects `window.stellar` and `window.freighter`, with connect and sign request modals
- Plain language transaction previews before signing
- History, market prices and charts, portfolio view, NFT gallery, ramp screen
- Light and dark themes, English and Hausa strings
- Popup UI plus a full tab desktop shell

## Stack

| Concern | Choice |
| --- | --- |
| Build | Vite 6, TypeScript 5.7 |
| UI | React 19, hand written CSS |
| Stellar | @stellar/stellar-sdk 13, Horizon and Soroban RPC |
| Keys | bip39, ed25519-hd-key |
| Extension | Manifest V3, service worker background, content and inpage scripts |
| Tests | Vitest, 15 suites covering crypto, signer, swaps, trustlines, history, passkeys, Ledger, dApp provider and settings |

## Repository layout

```
extension/
  manifest base and popup entry in public/ and the root html files
  src/
    components/   onboarding, send, receive, swap, history, settings, desktop shell, dApp modals
    extension/    background service worker, content script, inpage provider
    services/     stellar, signer, crypto, swaps, market, history, passkey, ledger, ramp, trustlines, scanning
    contexts/     wallet, theme, i18n
    tests/        Vitest suites
  PUBLISHING.md   sideload and Chrome Web Store steps
design guide.md   visual direction for the UI
extension/Stellar Wallet Extension - PRD v1.1 to v2 Features.md
extension/Stellar Wallet Extension - PRD & Design Briefs.pdf
```

## Running locally

```bash
cd extension
npm install
npm run dev
```

To load it in a browser:

```bash
npm run build
```

Then open `chrome://extensions`, switch on developer mode, choose "Load unpacked", and select `extension/dist`.

Other scripts:

```bash
npm test          # vitest
npm run lint      # eslint
npm run package   # production build plus a store zip
```

## Environment variables

```bash
STELLAR_NETWORK=testnet
RELAYER_SECRET_KEY=
PORT=3001
```

Testnet is the default network. Friendbot is used to fund new testnet accounts.

## Passkey accounts need a relayer

`services/passkey.ts` points at a relayer on `http://localhost:3001`. Passkey accounts and sponsored fees do not work until that relayer is deployed with a funded secret key. Everything else, including normal keypair wallets, works without it.

## Status

In development, not published to any store yet. The PRD, the design guide and the publishing guide are all in the repo so the remaining work is visible: deploy the relayer, finish the ramp integration, then submit the package built by `npm run package`.

## Author

Enoch Philip Dibal, https://devenoch.cv
