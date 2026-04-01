import { Router } from 'express';

const router = Router();

// Diagnostic routes removed. Pix integration is confirmed operational.
router.get('/health-check', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
