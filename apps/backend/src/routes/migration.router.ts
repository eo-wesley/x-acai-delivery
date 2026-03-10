import { Router } from 'express';
import { migrationService } from '../services/migration.service';
import { queueService } from '../services/queue.service';
import { getDb } from '../db/db.client';
import { randomUUID } from 'crypto';

const router = Router();

// 1. QR Code Tracking & Redirect
router.get('/qr/:id', async (req, res) => {
    const { id } = req.params;
    const ip = req.ip || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';

    try {
        await migrationService.trackScan(id, { ip, ua });

        const db = await getDb();
        const campaign = await db.get(`SELECT landing_slug FROM qr_campaigns WHERE id = ?`, [id]);

        const redirectUrl = campaign?.landing_slug || '/';
        res.redirect(redirectUrl);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao processar QR scan' });
    }
});

// 2. Conversion (Landing Page Lead Capture)
router.post('/convert', async (req, res) => {
    const { phone, name, restaurantId, campaignId, source } = req.body;

    if (!phone || !restaurantId) {
        return res.status(400).json({ error: 'Telefone e RestaurantId são obrigatórios' });
    }

    try {
        const db = await getDb();

        // 1. Criar ou atualizar cliente
        let customer = await db.get(`SELECT id FROM customers WHERE phone = ? AND restaurant_id = ?`, [phone, restaurantId]);
        const customerId = customer?.id || randomUUID();

        if (!customer) {
            await db.run(
                `INSERT INTO customers (id, restaurant_id, name, phone, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [customerId, restaurantId, name || 'Cliente Migrado', phone]
            );
        }

        // 2. Definir origem do cliente
        await migrationService.setCustomerSource(customerId, source || 'qr_campaign', campaignId);

        // 3. Gerar Cupom de Boas-vindas
        const couponCode = await migrationService.createCoupon(restaurantId, 10, 'percentage', 'BEMVINDO');

        // 4. Iniciar Automação de Boas-vindas via WhatsApp (BullMQ)
        await queueService.addJob('whatsapp-automation', 'welcome_msg', {
            type: 'welcome_migration',
            customerId,
            restaurantId,
            data: { couponCode }
        });

        res.json({
            success: true,
            couponCode,
            message: 'Cupom gerado e enviado via WhatsApp!'
        });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao processar conversão' });
    }
});

// 3. Analytics Dashboard
router.get('/analytics', async (req, res) => {
    const { restaurantId } = req.query;
    if (!restaurantId) return res.status(400).json({ error: 'restaurantId is required' });

    try {
        const stats = await migrationService.getMigrationStats(restaurantId as string);
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar métricas' });
    }
});

export const migrationRouter = router;
