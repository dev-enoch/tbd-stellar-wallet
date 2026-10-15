import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import { sponsorRouter } from './routes/sponsor';
import { passkeyRouter } from './routes/passkey';
import { anchorsRouter } from './routes/anchors';

export const app = express();

app.use(cors());
app.use(express.json());

// Health & System Info
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    network: config.stellarNetwork,
    relayerPublicKey: config.relayerKeypair.publicKey(),
    dailySponsoredLimit: config.dailySponsoredLimit,
    timestamp: Date.now(),
  });
});

// Relayer, Passkey & Anchor API Routes
app.use('/api/sponsor', sponsorRouter);
app.use('/api/passkey', passkeyRouter);
app.use('/api/anchors', anchorsRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[Stellith Relayer] Listening on http://localhost:${config.port}`);
    // eslint-disable-next-line no-console
    console.log(`[Stellith Relayer] Network: ${config.stellarNetwork}`);
    // eslint-disable-next-line no-console
    console.log(`[Stellith Relayer] Public Key: ${config.relayerKeypair.publicKey()}`);
  });
}
