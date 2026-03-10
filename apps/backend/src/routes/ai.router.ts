import { Router } from 'express';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { getDb } from '../db/db.client';
import { forecastingService } from '../services/forecasting.service';
import { aiOrderService } from '../services/ai_order.service';

export const aiRouter = Router();

// POST /api/:slug/ai/query
// A structured natural language handler (simulating LLM intent routing)
aiRouter.post('/query', tenantMiddleware, async (req: any, res: any) => {
    try {
        const { prompt } = req.body;
        const db = await getDb();
        const tenantId = req.tenantId;

        const lowPrompt = prompt.toLowerCase();
        let response = {
            answer: "Desculpe, ainda estou aprendendo sobre isso. Tente perguntar sobre vendas, estoque ou clientes.",
            data: null as any,
            type: 'text'
        };

        // INTENT: Sales / Faturamento
        if (lowPrompt.includes('venda') || lowPrompt.includes('faturamento') || lowPrompt.includes('ganh')) {
            const stats = await db.get(`
                SELECT SUM(total_cents) as total, COUNT(*) as count 
                FROM orders 
                WHERE restaurant_id = ? AND status = 'completed'
                AND created_at >= date('now', 'start of day')
            `, [tenantId]);

            const totalStr = ((stats.total || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            response.answer = `Hoje você realizou ${stats.count || 0} vendas, totalizando ${totalStr}.`;
            response.data = stats;
        }

        // INTENT: Stock / Estoque
        else if (lowPrompt.includes('estoque') || lowPrompt.includes('acabando') || lowPrompt.includes('falta')) {
            const critical = await forecastingService.getInventoryForecast(tenantId);
            const items = critical.filter(c => c.recommendation === 'critical');

            if (items.length > 0) {
                response.answer = `Atenção! Você tem ${items.length} itens em estado crítico: ${items.map(i => i.name).join(', ')}. Recomendo repor imediatamente.`;
            } else {
                response.answer = "Seu estoque parece estar em dia! Nenhum item crítico detectado no momento.";
            }
            response.data = items;
            response.type = 'warning_list';
        }

        // INTENT: VIP Customers
        else if (lowPrompt.includes('cliente') || lowPrompt.includes('melhor') || lowPrompt.includes('quem')) {
            const vips = await db.all(`
                SELECT name, total_spent_cents, orders_count 
                FROM customers 
                WHERE restaurant_id = ? 
                ORDER BY total_spent_cents DESC 
                LIMIT 3
            `, [tenantId]);

            if (vips.length > 0) {
                const names = vips.map(v => v.name).join(', ');
                response.answer = `Seus melhores clientes são: ${names}. Eles representam o maior faturamento da sua loja recentemente.`;
            } else {
                response.answer = "Ainda não tenho dados suficientes sobre seus clientes VIP.";
            }
            response.data = vips;
        }

        res.json(response);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/:slug/ai/forecast
aiRouter.get('/forecast', tenantMiddleware, async (req: any, res: any) => {
    try {
        const data = await forecastingService.getInventoryForecast(req.tenantId);
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/:slug/ai/order
// Procesar um pedido via linguagem natural
aiRouter.post('/order', tenantMiddleware, async (req: any, res: any) => {
    try {
        const { text, customerId } = req.body;
        const tenantId = req.tenantId;

        const order = await aiOrderService.processNaturalOrder(text, tenantId, customerId);
        res.json({
            success: true,
            message: "Pedido processado com sucesso via IA!",
            order
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
