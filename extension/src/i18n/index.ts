export type Language = 'en' | 'ha';

export interface Translations {
  // Brand & General
  appName: string;
  tagline: string;
  tbdBadge: string;
  copied: string;
  copy: string;
  close: string;
  cancel: string;
  confirm: string;
  save: string;
  back: string;
  next: string;
  done: string;
  loading: string;
  error: string;
  retry: string;
  addressCopied: string;

  // Onboarding
  welcomeTitle: string;
  welcomeSubtitle: string;
  createWalletBtn: string;
  importWalletBtn: string;
  openSourceNotice: string;
  howKeysStored: string;
  howKeysStoredDesc: string;

  // Create Wallet Flow
  setPasswordTitle: string;
  setPasswordDesc: string;
  passwordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  passwordMismatch: string;
  passwordTooShort: string;
  continueBtn: string;
  backupPhraseTitle: string;
  backupPhraseDesc: string;
  holdToReveal: string;
  releaseToHide: string;
  noScreenshotsWarn: string;
  savedPhraseConfirm: string;
  phraseQuizTitle: string;
  phraseQuizDesc: string;
  phraseQuizSuccess: string;
  wordInputPrompt: string;
  verifyAndFinish: string;

  // Import Wallet Flow
  importTitle: string;
  importDesc: string;
  mnemonicPlaceholder: string;
  invalidMnemonic: string;
  secretKeyOption: string;
  secretKeyWarn: string;

  // Lock & Unlock
  unlockTitle: string;
  enterPassword: string;
  unlockBtn: string;
  incorrectPassword: string;
  forgotPassword: string;
  forgotPasswordDesc: string;
  lockWallet: string;

  // Home & Balances
  totalBalance: string;
  change24h: string;
  availableSpendable: string;
  reservedBalance: string;
  reserveExplanation: string;
  unfundedAccountTitle: string;
  unfundedAccountDesc: string;
  fundWithFriendbot: string;
  sendAction: string;
  receiveAction: string;
  swapAction: string;
  addAssetAction: string;
  assetsTitle: string;

  // Send Flow
  sendTitle: string;
  recipientLabel: string;
  recipientPlaceholder: string;
  invalidAddress: string;
  unfundedRecipientWarn: string;
  memoRequiredWarn: string;
  assetLabel: string;
  amountLabel: string;
  amountPlaceholder: string;
  maxBtn: string;
  insufficientBalance: string;
  memoLabel: string;
  memoOptional: string;
  memoType: string;
  reviewSend: string;
  sendOutcomeButton: string;
  networkFee: string;
  totalDebit: string;
  sendSuccess: string;
  viewOnExplorer: string;

  // Receive Flow
  receiveTitle: string;
  receiveDisclaimer: string;
  yourAddress: string;

  // Trustlines & Assets
  manageAssetsTitle: string;
  trustlineExplanation: string;
  searchAssetPlaceholder: string;
  verifiedAsset: string;
  unverifiedAssetWarn: string;
  addAssetBtn: string;
  removeAssetBtn: string;
  cannotRemoveNonZero: string;
  reserveCostNote: string;

  // Swaps
  swapTitle: string;
  payLabel: string;
  receiveLabel: string;
  expectedOutput: string;
  minimumReceived: string;
  priceImpact: string;
  routeSummary: string;
  slippageTolerance: string;
  advancedSettings: string;
  highSlippageWarn: string;
  lowLiquidityWarn: string;
  quoteExpired: string;
  refreshQuote: string;
  swapOutcomeButton: string;
  addTrustlineAndSwap: string;

  // History
  historyTitle: string;
  noTransactions: string;
  statusCompleted: string;
  statusFailed: string;

  // Settings
  settingsTitle: string;
  themeLabel: string;
  themeDark: string;
  themeLight: string;
  networkLabel: string;
  networkMainnet: string;
  networkTestnet: string;
  languageLabel: string;
  currencyLabel: string;
  autoLockTimer: string;
  connectedSites: string;
  noConnectedSites: string;
  revokeAccess: string;
  revealPhrase: string;
  resetWallet: string;
  resetConfirmWarning: string;
  aboutTitle: string;
  versionLabel: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: "Stellith",
    tagline: "A Stellar wallet that explains itself, protects you, and shows what your money is doing.",
    tbdBadge: "Stellith",
    copied: "Copied!",
    copy: "Copy",
    close: "Close",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    back: "Back",
    next: "Next",
    done: "Done",
    loading: "Loading…",
    error: "Something went wrong",
    retry: "Try again",
    addressCopied: "Address copied to clipboard",

    welcomeTitle: "A clear, secure Stellar wallet",
    welcomeSubtitle: "Non-custodial, plain-language transactions, and smart route protection. Your keys never leave this device.",
    createWalletBtn: "Create a new wallet",
    importWalletBtn: "I already have a wallet",
    openSourceNotice: "Open source and verifiable on GitHub.",
    howKeysStored: "How your keys are stored",
    howKeysStoredDesc: "Keys are encrypted at rest with AES-256-GCM using your password. They live in memory only when unlocked and are cleared on lock.",

    setPasswordTitle: "Set your password",
    setPasswordDesc: "This password encrypts your wallet on this browser. We cannot reset it if forgotten.",
    passwordPlaceholder: "Enter strong password (min 8 chars)",
    confirmPasswordPlaceholder: "Confirm your password",
    passwordMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 8 characters",
    continueBtn: "Continue",
    backupPhraseTitle: "Back up your recovery phrase",
    backupPhraseDesc: "This 12-word recovery phrase is the only way to restore your wallet. Store it offline.",
    holdToReveal: "Hold to reveal phrase",
    releaseToHide: "Release to hide",
    noScreenshotsWarn: "Do not take screenshots. Anyone with this phrase can access your funds.",
    savedPhraseConfirm: "I have written down all 12 words in order",
    phraseQuizTitle: "Verify recovery phrase",
    phraseQuizDesc: "Confirm you backed up your phrase by selecting the requested words.",
    phraseQuizSuccess: "Phrase verified successfully!",
    wordInputPrompt: "Select word #{num}",
    verifyAndFinish: "Complete setup",

    importTitle: "Import wallet",
    importDesc: "Enter your 12-word recovery phrase to restore your accounts.",
    mnemonicPlaceholder: "Enter 12 words separated by spaces…",
    invalidMnemonic: "Invalid recovery phrase. Please check the 12 words and spelling.",
    secretKeyOption: "Import with private secret key (S…)",
    secretKeyWarn: "Caution: Secret keys do not support multi-account derivation.",

    unlockTitle: "Unlock wallet",
    enterPassword: "Enter wallet password",
    unlockBtn: "Unlock",
    incorrectPassword: "Incorrect password. Please try again.",
    forgotPassword: "Forgot password?",
    forgotPasswordDesc: "If you forgot your password, you must reset your wallet and import using your 12-word recovery phrase.",
    lockWallet: "Lock",

    totalBalance: "Total Value",
    change24h: "24h change",
    availableSpendable: "Available to spend",
    reservedBalance: "Reserved by network",
    reserveExplanation: "{reserved} XLM is reserved by the network for this account and {entries} trustlines.",
    unfundedAccountTitle: "Account not funded yet",
    unfundedAccountDesc: "Stellar accounts require a minimum balance of 1 XLM to be active on the ledger.",
    fundWithFriendbot: "Fund with Testnet Friendbot (+10,000 XLM)",
    sendAction: "Send",
    receiveAction: "Receive",
    swapAction: "Swap",
    addAssetAction: "Add Asset",
    assetsTitle: "Assets",

    sendTitle: "Send",
    recipientLabel: "Recipient address",
    recipientPlaceholder: "G… or M… (Stellar address)",
    invalidAddress: "Invalid Stellar public address",
    unfundedRecipientWarn: "Recipient account is not active yet. Minimum 1 XLM required to activate it.",
    memoRequiredWarn: "This recipient likely belongs to an exchange and requires a memo (SEP-29).",
    assetLabel: "Asset",
    amountLabel: "Amount",
    amountPlaceholder: "0.00",
    maxBtn: "Max",
    insufficientBalance: "Insufficient spendable balance",
    memoLabel: "Memo",
    memoOptional: "Optional",
    memoType: "Memo Type",
    reviewSend: "Review payment",
    sendOutcomeButton: "Send {amount} {asset}",
    networkFee: "Network fee",
    totalDebit: "Total deducted",
    sendSuccess: "Payment sent successfully!",
    viewOnExplorer: "View on Stellar.Expert",

    receiveTitle: "Receive",
    receiveDisclaimer: "Only send assets on the Stellar network to this address.",
    yourAddress: "Your public address",

    manageAssetsTitle: "Manage assets",
    trustlineExplanation: "Before you can hold an asset, your account must opt in to it (reserving 0.5 XLM).",
    searchAssetPlaceholder: "Search by asset code or issuer address…",
    verifiedAsset: "Verified Issuer",
    unverifiedAssetWarn: "Unverified issuer: verify the issuer address carefully before opting in.",
    addAssetBtn: "Opt In",
    removeAssetBtn: "Opt Out",
    cannotRemoveNonZero: "You must have a 0.00 balance before removing an asset.",
    reserveCostNote: "+0.5 XLM reserve required",

    swapTitle: "Swap",
    payLabel: "You pay",
    receiveLabel: "You receive",
    expectedOutput: "Expected output",
    minimumReceived: "Minimum received",
    priceImpact: "Price impact",
    routeSummary: "Route",
    slippageTolerance: "Slippage tolerance",
    advancedSettings: "Advanced settings",
    highSlippageWarn: "High slippage tolerance may result in an unfavorable trade.",
    lowLiquidityWarn: "Low liquidity detected. Price impact is unusually high.",
    quoteExpired: "Quote expired",
    refreshQuote: "Refresh quote",
    swapOutcomeButton: "Swap {payAmount} {payAsset} for ~{receiveAmount} {receiveAsset}",
    addTrustlineAndSwap: "Opt in and Swap",

    historyTitle: "Activity",
    noTransactions: "No transactions found yet.",
    statusCompleted: "Completed",
    statusFailed: "Failed",

    settingsTitle: "Settings",
    themeLabel: "Theme",
    themeDark: "Dark mode",
    themeLight: "Light mode",
    networkLabel: "Network",
    networkMainnet: "Stellar Mainnet",
    networkTestnet: "Stellar Testnet",
    languageLabel: "Language",
    currencyLabel: "Display Currency",
    autoLockTimer: "Auto-lock timeout",
    connectedSites: "Connected applications",
    noConnectedSites: "No applications connected yet.",
    revokeAccess: "Revoke",
    revealPhrase: "Reveal recovery phrase",
    resetWallet: "Reset wallet",
    resetConfirmWarning: "This will delete all wallet data and keys from this browser. Ensure your recovery phrase is backed up.",
    aboutTitle: "About Stellith",
    versionLabel: "Version",
  },
  ha: {
    appName: "Stellith",
    tagline: "Walat ta Stellar mai bayyana kanta, kare ku, da nuna abin da kuɗinku ke yi.",
    tbdBadge: "Stellith",
    copied: "An kwafa!",
    copy: "Kwafa",
    close: "Rufe",
    cancel: "Soke",
    confirm: "Tabbatar",
    save: "Ajiye",
    back: "Koma baya",
    next: "Gaba",
    done: "An kammala",
    loading: "Yana lodi…",
    error: "Wani abu ya sami matsala",
    retry: "Sake gwadawa",
    addressCopied: "An kwafi adireshin zuwa allon allo",

    welcomeTitle: "Walat ta Stellar mai tsabta da aminci",
    welcomeSubtitle: "Ba tare da kowane ɓangare na uku yana riƙe makullin ku ba. Makullin ku ba sa fita daga wannan na'urar.",
    createWalletBtn: "Ƙirƙiri sabuwar walat",
    importWalletBtn: "Ina da walat a riga",
    openSourceNotice: "Bude tushe kuma ana iya dubawa a GitHub.",
    howKeysStored: "Yadda aka adana makullanku",
    howKeysStoredDesc: "An ɓoye makullai a hutawa tare da AES-256-GCM ta amfani da kalmar sirrinku. Suna rayuwa a ƙwaƙwalwar ajiya kawai lokacin buɗewa.",

    setPasswordTitle: "Saita kalmar sirrinku",
    setPasswordDesc: "Wannan kalmar sirri tana ɓoye walat ɗinku a wannan burauzar. Ba za mu iya sake saita ta ba idan an manta.",
    passwordPlaceholder: "Shigar da kalmar sirri mai ƙarfi (aƙalla haruffa 8)",
    confirmPasswordPlaceholder: "Tabbatar da kalmar sirrinku",
    passwordMismatch: "Kalmomin sirri ba su dace ba",
    passwordTooShort: "Kalmar sirri dole ne ta kasance aƙalla haruffa 8",
    continueBtn: "Ci gaba",
    backupPhraseTitle: "Ajiye kalmomin dawowarku",
    backupPhraseDesc: "Wadannan kalmomi 12 sune kadai hanyar dawo da walat dinku. Adana su a waje.",
    holdToReveal: "Riƙe don bayyana kalmomi",
    releaseToHide: "Saki don ɓoyewa",
    noScreenshotsWarn: "Kada ku ɗauki hoton allo. Duk wanda ke da waɗannan kalmomi zai iya karɓar kuɗin ku.",
    savedPhraseConfirm: "Na rubuta dukkan kalmomi 12 a jere",
    phraseQuizTitle: "Tabbatar da kalmomin dawo da kuɗi",
    phraseQuizDesc: "Tabbatar cewa kun ajiye kalmomin ku ta zaɓar kalmomin da aka nema.",
    phraseQuizSuccess: "An tabbatar da kalmomin cikin nasara!",
    wordInputPrompt: "Zaɓi kalma #{num}",
    verifyAndFinish: "Kammala saitin",

    importTitle: "Shigo da walat",
    importDesc: "Shigar da kalmomin dawowarku guda 12 don dawo da asusunku.",
    mnemonicPlaceholder: "Shigar da kalmomi 12 tare da tazara…",
    invalidMnemonic: "Kalmomin dawowa marasa inganci. Da fatan za a bincika kalmomin.",
    secretKeyOption: "Shigo da sirrin sirri (S…)",
    secretKeyWarn: "Gargaɗi: Makullin sirri ba ya goyan bayan asusun da yawa.",

    unlockTitle: "Bude walat",
    enterPassword: "Shigar da kalmar sirrin walat",
    unlockBtn: "Buɗe",
    incorrectPassword: "Kalmar sirri ba daidai ba. Da fatan a sake gwadawa.",
    forgotPassword: "An manta kalmar sirri?",
    forgotPasswordDesc: "Idan ka manta kalmar sirrinka, dole ne ka sake saita walat ɗinka ka shigo da ita ta amfani da kalmomin dawo da 12.",
    lockWallet: "Kulle",

    totalBalance: "Jimillar Kuɗi",
    change24h: "Sauyin 24h",
    availableSpendable: "Akwai don kashewa",
    reservedBalance: "Hanyar sadarwa ta adana",
    reserveExplanation: "{reserved} XLM an adana shi ta hanyar sadarwa don wannan asusu da kadarori {entries}.",
    unfundedAccountTitle: "Ba a ba da kuɗi ga asusun ba tukuna",
    unfundedAccountDesc: "Asusun Stellar yana buƙatar aƙalla 1 XLM don fara aiki.",
    fundWithFriendbot: "Sami 10,000 XLM kyauta daga Friendbot (Testnet)",
    sendAction: "Aika",
    receiveAction: "Karɓa",
    swapAction: "Musanya",
    addAssetAction: "Ƙara Kadara",
    assetsTitle: "Kadarori",

    sendTitle: "Aika",
    recipientLabel: "Adireshin mai karɓa",
    recipientPlaceholder: "G… ko M… (Adireshin Stellar)",
    invalidAddress: "Adireshin Stellar mara inganci",
    unfundedRecipientWarn: "Asusun mai karɓa bai fara aiki ba tukuna. Ana buƙatar aƙalla 1 XLM.",
    memoRequiredWarn: "Wannan mai karɓar yana buƙatar bayanin kula (memo) a cewar SEP-29.",
    assetLabel: "Kadara",
    amountLabel: "Adadi",
    amountPlaceholder: "0.00",
    maxBtn: "Duka",
    insufficientBalance: "Kuɗin da ke akwai don kashewa bai isa ba",
    memoLabel: "Memo",
    memoOptional: "Na zaɓi",
    memoType: "Nau'in Memo",
    reviewSend: "Duba biya",
    sendOutcomeButton: "Aika {amount} {asset}",
    networkFee: "Kudin hanyar sadarwa",
    totalDebit: "Jimillar abin da za a cire",
    sendSuccess: "An aika biyan kuɗi cikin nasara!",
    viewOnExplorer: "Duba a Stellar.Expert",

    receiveTitle: "Karɓa",
    receiveDisclaimer: "Kada ku tura wani abu banda kadarorin Stellar zuwa wannan adireshin.",
    yourAddress: "Adireshin ku na jama'a",

    manageAssetsTitle: "Sarrafa kadarori",
    trustlineExplanation: "Kafin ka iya riƙe kadara, dole ne asusunka ya ba da izini (yana riƙe 0.5 XLM).",
    searchAssetPlaceholder: "Bincika ta lambar kadara ko adireshin mai fitarwa…",
    verifiedAsset: "Tabbataccen Mai Fitarwa",
    unverifiedAssetWarn: "Gargaɗi: Mai fitarwa ba a tabbatar da shi ba.",
    addAssetBtn: "Ba da izini",
    removeAssetBtn: "Cire izini",
    cannotRemoveNonZero: "Dole ne ka sami ma'aunin 0.00 kafin cire kadara.",
    reserveCostNote: "+0.5 XLM ajiya da ake buƙata",

    swapTitle: "Musanya",
    payLabel: "Za ku biya",
    receiveLabel: "Za ku karɓa",
    expectedOutput: "Abin da ake tsammanin samu",
    minimumReceived: "Mafi ƙarancin abin da za a karɓa",
    priceImpact: "Tasirin farashi",
    routeSummary: "Hanya",
    slippageTolerance: "Haƙurin zamewa",
    advancedSettings: "Ƙarin saituna",
    highSlippageWarn: "Babban haƙurin zamewa na iya haifar da musayar mara kyau.",
    lowLiquidityWarn: "An gano ƙarancin ruwa.",
    quoteExpired: "Farashin ya ƙare",
    refreshQuote: "Sake duba farashi",
    swapOutcomeButton: "Musanya {payAmount} {payAsset} don ~{receiveAmount} {receiveAsset}",
    addTrustlineAndSwap: "Ba da izini & Musanya",

    historyTitle: "Ayyuka",
    noTransactions: "Babu hada-hadar kuɗi tukuna.",
    statusCompleted: "An kammala",
    statusFailed: "Ba a yi nasara ba",

    settingsTitle: "Saituna",
    themeLabel: "Jigo",
    themeDark: "Yanayin Duhu",
    themeLight: "Yanayin Haske",
    networkLabel: "Hanyar sadarwa",
    networkMainnet: "Stellar Mainnet",
    networkTestnet: "Stellar Testnet",
    languageLabel: "Harshe",
    currencyLabel: "Kudin nuni",
    autoLockTimer: "Lokacin kulle ta atomatik",
    connectedSites: "Aikace-aikacen da aka haɗa",
    noConnectedSites: "Babu aikace-aikacen da aka haɗa tukuna.",
    revokeAccess: "Cire haɗi",
    revealPhrase: "Bayyana kalmomin dawowa",
    resetWallet: "Sake saita walat",
    resetConfirmWarning: "Wannan zai goge duk bayanan walat ɗin daga wannan burauzar.",
    aboutTitle: "Game da Stellith",
    versionLabel: "Sigar",
  },
};
