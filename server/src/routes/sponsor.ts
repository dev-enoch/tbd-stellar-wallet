import { Router, Request, Response } from 'express';
import { relayerService } from '../services/relayer';

export const sponsorRouter = Router();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * POST /api/sponsor/check
 * Verifies if an account and client IP are eligible for sponsored transactions today.
 */
sponsorRouter.post('/check', (req: Request, res: Response): void => {
  const { contractAddress } = req.body;
  if (!contractAddress || typeof contractAddress !== 'string') {
    res.status(400).json({ error: 'contractAddress is required' });
    return;
  }

  const clientIp = getClientIp(req);
  const eligibility = relayerService.checkEligibility(contractAddress, clientIp);
  res.json(eligibility);
});

/**
 * POST /api/sponsor/sign
 * Validates the transaction XDR, checks rate limits, and signs a FeeBumpTransaction.
 */
sponsorRouter.post('/sign', (req: Request, res: Response): void => {
  const { transactionXdr, contractAddress } = req.body;

  if (!transactionXdr || !contractAddress) {
    res.status(400).json({ error: 'transactionXdr and contractAddress are required' });
    return;
  }

  const clientIp = getClientIp(req);
  const result = relayerService.sponsorTransaction(transactionXdr, contractAddress, clientIp);
  if (!result.success) {
    res.status(429).json(result);
    return;
  }

  res.json(result);
});

/**
 * POST /api/sponsor/relay-invocation
 * Relays a Soroban smart account invocation where the relayer is transaction source
 * and the user authorizes via secp256r1 passkey authorization entry.
 */
sponsorRouter.post('/relay-invocation', async (req: Request, res: Response): Promise<void> => {
  const { contractAddress, authEntries, functionName } = req.body;

  if (!contractAddress || !functionName) {
    res.status(400).json({ error: 'contractAddress and functionName are required' });
    return;
  }

  const clientIp = getClientIp(req);
  const result = await relayerService.relaySmartAccountInvocation({
    contractAddress,
    authEntries,
    functionName,
    clientIp,
  });

  if (!result.success) {
    res.status(429).json(result);
    return;
  }

  res.json(result);
});
