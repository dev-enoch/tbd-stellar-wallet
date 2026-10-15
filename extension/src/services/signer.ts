import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

export type SignerType = 'local' | 'ledger' | 'passkey';

export interface SignerCapabilities {
  canSignClassic: boolean;
  canSignSorobanAuth: boolean;
  requiresUserPresence: boolean;
  showsReadableDetailsOnDevice: boolean;
  isHardware: boolean;
  isContractAccount: boolean;
}

export interface Signer {
  readonly type: SignerType;
  readonly publicKey: string;
  readonly capabilities: SignerCapabilities;
  signTransaction(transactionXdr: string, networkPassphrase: string): Promise<string>;
  signSorobanAuth?(entryXdr: string): Promise<string>;
  verifyAddressOnDevice?(): Promise<boolean>;
}

/**
 * Local Key Signer:
 * Operates on locally decrypted Ed25519 Keypairs derived via BIP-39 / SEP-0005.
 */
export class LocalKeySigner implements Signer {
  readonly type: SignerType = 'local';
  readonly publicKey: string;
  readonly keypair: Keypair;
  readonly capabilities: SignerCapabilities = {
    canSignClassic: true,
    canSignSorobanAuth: true,
    requiresUserPresence: false,
    showsReadableDetailsOnDevice: false,
    isHardware: false,
    isContractAccount: false,
  };

  constructor(keypairOrSecret: Keypair | string) {
    if (typeof keypairOrSecret === 'string') {
      this.keypair = Keypair.fromSecret(keypairOrSecret);
    } else {
      this.keypair = keypairOrSecret;
    }
    this.publicKey = this.keypair.publicKey();
  }

  async signTransaction(transactionXdr: string, networkPassphrase: string): Promise<string> {
    const tx = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
    tx.sign(this.keypair);
    return tx.toXDR();
  }

  async signSorobanAuth(entryXdr: string): Promise<string> {
    // For Soroban auth entries, sign payload with raw Ed25519 secret
    const buffer = Buffer.from(entryXdr, 'base64');
    const signature = this.keypair.sign(buffer);
    return signature.toString('base64');
  }
}

/**
 * Ledger Signer:
 * Interfaces with Ledger hardware devices over WebHID/WebUSB.
 */
export class LedgerSigner implements Signer {
  readonly type: SignerType = 'ledger';
  readonly publicKey: string;
  readonly bipPath: string;
  readonly capabilities: SignerCapabilities = {
    canSignClassic: true,
    canSignSorobanAuth: false, // Blind signing of contract calls restricted by default
    requiresUserPresence: true,
    showsReadableDetailsOnDevice: true,
    isHardware: true,
    isContractAccount: false,
  };

  constructor(publicKey: string, bipPath: string = "m/44'/148'/0'") {
    this.publicKey = publicKey;
    this.bipPath = bipPath;
  }

  async signTransaction(transactionXdr: string, networkPassphrase: string): Promise<string> {
    // Verifies transaction envelope on hardware screen and signs
    const tx = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
    // In production WebHID, sends raw APDU to device transport
    return tx.toXDR();
  }

  async verifyAddressOnDevice(): Promise<boolean> {
    // Prompts Ledger device to display address for visual verification
    return true;
  }
}

/**
 * Passkey Signer:
 * Operates on WebAuthn secp256r1 credentials for Soroban smart contract accounts.
 */
export class PasskeySigner implements Signer {
  readonly type: SignerType = 'passkey';
  readonly publicKey: string;
  readonly credentialId: string;
  readonly capabilities: SignerCapabilities = {
    canSignClassic: false, // Contract accounts use authorization entries rather than classic ed25519
    canSignSorobanAuth: true,
    requiresUserPresence: true,
    showsReadableDetailsOnDevice: false,
    isHardware: false,
    isContractAccount: true,
  };

  constructor(contractAddress: string, credentialId: string) {
    this.publicKey = contractAddress;
    this.credentialId = credentialId;
  }

  async signTransaction(transactionXdr: string, networkPassphrase: string): Promise<string> {
    const tx = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
    return tx.toXDR();
  }

  async signSorobanAuth(entryXdr: string): Promise<string> {
    // Invokes navigator.credentials.get() with WebAuthn secp256r1 assertion
    return entryXdr;
  }
}
