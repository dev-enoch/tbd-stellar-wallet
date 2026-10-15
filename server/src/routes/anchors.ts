import { Router, Request, Response } from 'express';
import { sep24AnchorService } from '../services/sep24';

export const anchorsRouter = Router();

/**
 * GET /api/anchors
 * Lists candidate anchors with pilot approval status and regulatory disclosures.
 */
anchorsRouter.get('/', (_req: Request, res: Response): void => {
  const anchors = sep24AnchorService.listPartners();
  res.json(anchors);
});

/**
 * GET /api/anchors/toml
 * Resolves stellar.toml from an anchor domain dynamically per SEP-1.
 */
anchorsRouter.get('/toml', async (req: Request, res: Response): Promise<void> => {
  const domain = req.query.domain as string;
  if (!domain) {
    res.status(400).json({ error: 'domain query parameter is required' });
    return;
  }

  try {
    const tomlData = await sep24AnchorService.resolveAnchorToml(domain);
    res.json(tomlData);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

/**
 * POST /api/anchors/interactive-url
 * Obtains an authentic SEP-24 hosted interactive deposit/withdraw session from the anchor.
 */
anchorsRouter.post('/interactive-url', async (req: Request, res: Response): Promise<void> => {
  const { domain, assetCode, account, amount, jwtToken } = req.body;

  if (!domain || !assetCode || !account) {
    res.status(400).json({ error: 'domain, assetCode, and account are required' });
    return;
  }

  try {
    const session = await sep24AnchorService.getInteractiveDepositUrl({
      domain,
      assetCode,
      account,
      amount,
      jwtToken,
    });
    res.json(session);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

/**
 * GET /api/anchors/transaction-status
 * Polls the anchor's official transaction status endpoint per SEP-24.
 */
anchorsRouter.get('/transaction-status', async (req: Request, res: Response): Promise<void> => {
  const domain = req.query.domain as string;
  const transactionId = req.query.transactionId as string;
  const jwtToken = req.headers.authorization?.replace('Bearer ', '');

  if (!domain || !transactionId) {
    res.status(400).json({ error: 'domain and transactionId are required' });
    return;
  }

  try {
    const status = await sep24AnchorService.getTransactionStatus({
      domain,
      transactionId,
      jwtToken,
    });
    res.json(status);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});
