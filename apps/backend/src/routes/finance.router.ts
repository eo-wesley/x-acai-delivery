import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { financeRepo } from '../db/repositories/finance.repo';

export const financeRouter = Router();

// Obter status do caixa atual
financeRouter.get('/admin/finance/cash/current', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const session = await financeRepo.getCurrentSession(tenantId);
        res.json(session || { status: 'closed' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Abrir caixa
financeRouter.post('/admin/finance/cash/open', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const { initialValueCents } = req.body;
        const sessionId = await financeRepo.openCash(req.tenantId, req.user.id, initialValueCents);
        res.status(201).json({ success: true, sessionId });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Fechar caixa
financeRouter.post('/admin/finance/cash/close', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const { sessionId, finalValueCents } = req.body;
        const result = await financeRepo.closeCash(req.tenantId, sessionId, finalValueCents);
        res.json({ success: true, ...result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Adicionar lançamento (Sangria/Suprimento)
financeRouter.post('/admin/finance/entries', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const { sessionId, type, category, valueCents, description } = req.body;
        const id = await financeRepo.addEntry(req.tenantId, sessionId, { type, category, valueCents, description });
        res.status(201).json({ success: true, id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Listar lançamentos
financeRouter.get('/admin/finance/entries', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const sessionId = req.query.sessionId as string;
        const entries = await financeRepo.listEntries(req.tenantId, sessionId);
        res.json(entries);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Relatório DRE
financeRouter.get('/admin/finance/reports/dre', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const { start, end } = req.query;
        const dre = await financeRepo.getDRE(req.tenantId, start as string, end as string);
        res.json(dre);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
