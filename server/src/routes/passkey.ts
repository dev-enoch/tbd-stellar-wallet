import { Router, Request, Response } from 'express';
import { smartAccountService } from '../services/smartAccount';

export const passkeyRouter = Router();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * POST /api/passkey/deploy-account
 * Deploys a Soroban smart account for a passkey credential and funds initial rent reserve.
 * Enforces IP-level and global daily limits to prevent relayer draining.
 */
passkeyRouter.post('/deploy-account', async (req: Request, res: Response): Promise<void> => {
  const { credentialId, publicKeyBase64, nickname, ownerPublicKey } = req.body;

  if (!credentialId || !publicKeyBase64) {
    res.status(400).json({ error: 'credentialId and publicKeyBase64 are required' });
    return;
  }

  const clientIp = getClientIp(req);
  const result = await smartAccountService.deploySmartAccount({
    credentialId,
    publicKeyBase64,
    nickname,
    ownerPublicKey,
    clientIp,
  });

  if (!result.success) {
    res.status(429).json(result);
    return;
  }

  res.json(result);
});

/**
 * POST /api/passkey/add-recovery
 * Adds an on-chain backup passkey for device recovery (PRD Section 8).
 * Requires cryptographic authorization from the primary passkey.
 */
passkeyRouter.post('/add-recovery', (req: Request, res: Response): void => {
  const { contractAddress, recoveryCredentialId, existingSignerAuthSignature } = req.body;

  if (!contractAddress || !recoveryCredentialId) {
    res.status(400).json({ error: 'contractAddress and recoveryCredentialId are required' });
    return;
  }

  const result = smartAccountService.addRecoveryPasskey({
    contractAddress,
    recoveryCredentialId,
    existingSignerAuthSignature,
  });

  if (!result.success) {
    res.status(401).json(result);
    return;
  }

  res.json({ success: true, contractAddress, recoveryCredentialId });
});

/**
 * GET /api/passkey/account/:contractAddress
 * Retrieves account information and recovery keys.
 */
passkeyRouter.get('/account/:contractAddress', (req: Request, res: Response): void => {
  const account = smartAccountService.getAccount(req.params.contractAddress);
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  res.json(account);
});
