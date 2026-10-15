import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
} from '@stellar/stellar-sdk';

const server = new Horizon.Server('https://horizon-testnet.stellar.org');

async function fundWithFriendbot(publicKey: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) {
    throw new Error(`Friendbot failed with status ${res.status}: ${await res.text()}`);
  }
}

async function runProof() {
  console.log('--- Generating Real On-Chain Testnet Evidence for Stellith Wallet ---\n');

  // 1. Relayer and User Accounts
  const relayerKeypair = Keypair.random();
  const userKeypair = Keypair.random();
  const recipientKeypair = Keypair.random();
  const recoveryKeypair = Keypair.random();

  console.log(`Relayer Public Key: ${relayerKeypair.publicKey()}`);
  console.log(`User Public Key:    ${userKeypair.publicKey()}`);
  console.log(`Recovery Key:       ${recoveryKeypair.publicKey()}`);

  console.log('\n[1/3] Funding accounts on Stellar Testnet via Friendbot...');
  await fundWithFriendbot(relayerKeypair.publicKey());
  await fundWithFriendbot(userKeypair.publicKey());
  console.log('✓ Accounts successfully funded.');

  // Find Testnet Deposit Transaction Hash for User Account
  const payments = await server.payments().forAccount(userKeypair.publicKey()).call();
  const depositTxHash = payments.records[0]?.transaction_hash;
  console.log(`\n======================================================`);
  console.log(`EVIDENCE 1: TESTNET DEPOSIT TRANSACTION`);
  console.log(`Transaction Hash: ${depositTxHash}`);
  console.log(`Explorer Link:    https://stellar.expert/explorer/testnet/tx/${depositTxHash}`);
  console.log(`======================================================\n`);

  // 2. Real Sponsored Payment Transaction
  console.log('[2/3] Constructing and submitting real Relayer Sponsored Payment...');
  const userAccount = await server.loadAccount(userKeypair.publicKey());

  // Inner transaction: user is source, fee is 100 stroops
  const innerTx = new TransactionBuilder(userAccount, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: relayerKeypair.publicKey(),
        asset: Asset.native(),
        amount: '1.5',
      })
    )
    .setTimeout(60)
    .build();

  // User signs the inner transaction
  innerTx.sign(userKeypair);

  // Relayer builds and signs FeeBumpTransaction wrapping the inner transaction
  const sponsoredFeeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
    relayerKeypair,
    '200',
    innerTx,
    Networks.TESTNET
  );
  sponsoredFeeBumpTx.sign(relayerKeypair);

  // Submit to testnet
  const sponsoredResult = await server.submitTransaction(sponsoredFeeBumpTx);
  console.log(`\n======================================================`);
  console.log(`EVIDENCE 2: RELAYER SPONSORED PAYMENT TRANSACTION`);
  console.log(`Transaction Hash: ${sponsoredResult.hash}`);
  console.log(`Inner Tx Hash:    ${(sponsoredResult as any).inner_transaction_hash || 'N/A'}`);
  console.log(`Explorer Link:    https://stellar.expert/explorer/testnet/tx/${sponsoredResult.hash}`);
  console.log(`Fee Payer:        ${relayerKeypair.publicKey()} (Relayer)`);
  console.log(`Sender:           ${userKeypair.publicKey()}`);
  console.log(`======================================================\n`);

  // 3. Real On-Chain Signer / Multi-Device Recovery Transaction
  console.log('[3/3] Submitting on-chain recovery signer authorization...');
  const updatedUserAccount = await server.loadAccount(userKeypair.publicKey());

  const recoveryTx = new TransactionBuilder(updatedUserAccount, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.setOptions({
        signer: {
          ed25519PublicKey: recoveryKeypair.publicKey(),
          weight: 1,
        },
      })
    )
    .setTimeout(60)
    .build();

  recoveryTx.sign(userKeypair);
  const recoveryResult = await server.submitTransaction(recoveryTx);

  console.log(`\n======================================================`);
  console.log(`EVIDENCE 3: ON-CHAIN RECOVERY SIGNER ADDITION TRANSACTION`);
  console.log(`Transaction Hash: ${recoveryResult.hash}`);
  console.log(`Explorer Link:    https://stellar.expert/explorer/testnet/tx/${recoveryResult.hash}`);
  console.log(`Authorized By:    ${userKeypair.publicKey()} (Primary Key)`);
  console.log(`New Signer Added: ${recoveryKeypair.publicKey()} (Recovery Device)`);
  console.log(`======================================================\n`);

  console.log('All 3 on-chain transactions successfully confirmed on Stellar Testnet!');
}

runProof().catch((err) => {
  console.error('Proof generation failed:', err.message);
  if (err.response?.data?.extras?.result_codes) {
    console.error('Horizon result codes:', JSON.stringify(err.response.data.extras.result_codes, null, 2));
  }
  process.exit(1);
});
