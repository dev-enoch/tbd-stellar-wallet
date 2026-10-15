import { Router, Request, Response } from 'express';
import { relayerService } from '../services/relayer';

export const sponsorRouter = Router();

/**
 * POST /api/sponsor/check
 * Verifies if an account is eligible for sponsored transactions today.
 */
sponsorRouter.post('/check', (req: Request, res: Response): void => {
  const { contractAddress } = req.body;
  if (!contractAddress || typeof contractAddress !== 'string') {
    res.status(400).json({ error: 'contractAddress is required' });
    return;
  }

  const eligibility = relayerService.checkEligibility(contractAddress);
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

  const result = relayerService.sponsorTransaction(transactionXdr, contractAddress);
  if (!result.success) {
    res.status(429).json(result);
    return;
  }

  res.json(result);
});
