import { Router, Request, Response } from 'express';
import { smartAccountService } from '../services/smartAccount';

export const passkeyRouter = Router();

/**
 * POST /api/passkey/deploy-account
 * Deploys a Soroban smart account for a passkey credential and funds initial rent reserve.
 */
passkeyRouter.post('/deploy-account', async (req: Request, res: Response): Promise<void> => {
  const { credentialId, publicKeyBase64, nickname, ownerPublicKey } = req.body;

  if (!credentialId || !publicKeyBase64) {
    res.status(400).json({ error: 'credentialId and publicKeyBase64 are required' });
    return;
  }

  const result = await smartAccountService.deploySmartAccount({
    credentialId,
    publicKeyBase64,
    nickname,
    ownerPublicKey,
  });

  if (!result.success) {
    res.status(500).json(result);
    return;
  }

  res.json(result);
});

/**
 * POST /api/passkey/add-recovery
 * Adds a second passkey for backup device recovery (PRD Section 8).
 */
passkeyRouter.post('/add-recovery', (req: Request, res: Response): void => {
  const { contractAddress, recoveryCredentialId } = req.body;

  if (!contractAddress || !recoveryCredentialId) {
    res.status(400).json({ error: 'contractAddress and recoveryCredentialId are required' });
    return;
  }

  const success = smartAccountService.addRecoveryPasskey(contractAddress, recoveryCredentialId);
  if (!success) {
    res.status(404).json({ error: 'Smart account not found' });
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
