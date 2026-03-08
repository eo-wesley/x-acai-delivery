import { Router, Request, Response } from 'express';

const webhookRouter = Router();

webhookRouter.get('/webhook', (req: Request, res: Response) => {
  res.status(200).send('ok');
});

webhookRouter.post('/webhook', async (req: Request, res: Response) => {
  res.status(200).json({ received: true });
});

export default webhookRouter;
