# Stellith Wallet — Extension Publishing Guide

This guide walks you through publishing **Stellith Wallet** to the **Chrome Web Store**, **Microsoft Edge Add-ons**, and testing it locally in your browser.

---

## 1. Quick Local Installation (Sideloading in 30 Seconds)

You can install and use Stellith immediately on your browser right now without waiting for store approval:

1. Build the extension:
   ```bash
   npm run build
   ```
2. Open your Chromium browser (**Google Chrome**, **Brave**, **Arc**, **Microsoft Edge**, **Opera**):
   - In Chrome/Brave: Go to `chrome://extensions/`
   - In Edge: Go to `edge://extensions/`
3. Toggle on **"Developer mode"** (top-right corner).
4. Click **"Load unpacked"** (top-left).
5. Select the `dist/` directory inside `extension/`:
   ```
   Works\stellar-project\extension\dist
   ```
6. Pin **Stellith Wallet** to your toolbar. The wallet is now fully functional and will inject `window.stellar` / `window.freighter` into any open Stellar dApp!

---

## 2. Chrome Web Store Publishing (Step-by-Step)

Publishing to the Chrome Web Store also enables users of Brave, Arc, Opera, and Vivaldi to install Stellith.

### Step 1: Create the Store-Ready ZIP Package
Run the packaging command:
```bash
npm run package
```
This produces `stellith-wallet-v1.0.0.zip` containing the compiled `dist/` files (`manifest.json`, `background.js`, `content.js`, `inpage.js`, icons, and UI assets).

> **Important**: Do not zip the parent folder or the `dist/` folder itself. The `.zip` root must contain `manifest.json`. The `npm run package` script formats this automatically.

---

### Step 2: Register a Chrome Web Store Developer Account
1. Visit the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with the Google Account you wish to associate with Stellith.
3. Pay the **one-time $5 USD registration fee** (Google's anti-spam fee).

---

### Step 3: Upload the Package
1. In the Developer Dashboard, click **"Add new item"**.
2. Drag and drop `stellith-wallet-v1.0.0.zip` (or click Browse and select it).
3. The dashboard will automatically parse your `manifest.json` (version `1.0.0`, permissions, extension name: **Stellith — Stellar Wallet**).

---

### Step 4: Complete the Store Listing

Fill out the metadata in the dashboard:

#### Basic Information
- **Name**: `Stellith — Stellar Wallet`
- **Summary / Description**:
  ```
  Stellith is a fast, non-custodial browser extension wallet for the Stellar network. Send, receive, and swap XLM and Stellar assets with human-readable transaction previews, built-in DEX path payments, Soroban smart contract support, and multi-account keystores.
  ```
- **Category**: `Productivity` or `Financial / Crypto`
- **Language**: `English`

#### Graphic Assets
- **Store Icon**: 128 × 128 px PNG (`Stellith_logo.jpg` or converted PNG).
- **Screenshots**: At least 1 screenshot (1280 × 800 px or 640 × 400 px JPEG/PNG):
  - Screenshot 1: Account portfolio and balance view.
  - Screenshot 2: 3-step send & plain-language preview.
  - Screenshot 3: In-app DEX swap with path routing.
  - Screenshot 4: Apple-style settings and network selector.
- **Small Promo Tile** (optional): 440 × 280 px.
- **Marquee Promo Tile** (optional): 1400 × 560 px.

---

### Step 5: Privacy Practices & Permissions Disclosure

Google requires specific disclosures for extension permissions:

1. **Single Purpose Description**:
   > *"Stellith is a non-custodial Stellar wallet that allows users to manage accounts, sign Stellar and Soroban transactions, and interact with decentralized applications."*

2. **Permissions Justifications**:
   - `storage`: *"Required to store encrypted BIP-39 keystores, account preferences, and contact address book locally on the user's device."*
   - `alarms`: *"Required to trigger configurable auto-lock timers that clear in-memory credentials when idle."*
   - `host_permissions` (`horizon.stellar.org`, `horizon-testnet.stellar.org`, `friendbot.stellar.org`): *"Required to query Stellar account balances, submit signed transaction XDR envelopes to the Stellar network, and fund test accounts via Friendbot."*

3. **User Data Handling**:
   - Check **"No"** to: *Do you sell user data? Do you use data for creditworthiness or lending?*
   - Under Data usage: Select **"Authentication Information"** (used solely locally for keystore decryption; never transmitted off-device).

4. **Privacy Policy URL**:
   - Host a minimal privacy policy explaining that Stellith is non-custodial and does not collect or transmit private keys, seed phrases, or personal tracking information.

---

### Step 6: Submit for Review
1. Click **"Submit for review"**.
2. Google’s review typically takes **1 to 3 business days**.
3. Once approved, Stellith will be live on the Chrome Web Store with an official store link!

---

## 3. Microsoft Edge Add-ons (Optional)

Microsoft Edge allows importing extensions directly from Chrome:
1. Go to [Microsoft Edge Partner Center](https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview).
2. Sign in with a Microsoft account (free registration).
3. Click **"Create new extension"** and choose **"Import from Chrome Web Store"** or upload `stellith-wallet-v1.0.0.zip`.
4. Review typically takes 24–48 hours.

---

## 4. Updates & Future Releases

Whenever you release a new version:
1. Increment the `"version"` field in both `package.json` and `public/manifest.json` (e.g. `1.0.1`).
2. Run `npm run package`.
3. Go to the Developer Dashboard, click **Stellith**, and click **"Upload updated package"**.
4. Submit for review. Updates roll out automatically to existing users within hours of approval.
