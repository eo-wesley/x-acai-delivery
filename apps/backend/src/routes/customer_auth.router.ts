import { Router } from 'express';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { customersRepo } from '../db/repositories/customers.repo';
import jwt from 'jsonwebtoken';

export const customerAuthRouter = Router();

// POST /api/:slug/customer/auth/request-otp
customerAuthRouter.post('/:slug/customer/auth/request-otp', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { phone } = req.body;

        if (!phone) return res.status(400).json({ error: 'Telefone é obrigatório' });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Upsert customer if not exists and update OTP
        await customersRepo.upsertCustomer(tenantId, { name: 'Cliente', phone });
        await customersRepo.updateOTP(tenantId, phone, otp, expiresAt);

        // MOCK: In a real scenario, send via WhatsApp/SMS
        console.log(`[AUTH] OTP for ${phone} (${tenantId}): ${otp}`);

        res.json({ success: true, message: 'Código enviado com sucesso (Mock/Console)' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/:slug/customer/auth/verify-otp
customerAuthRouter.post('/:slug/customer/auth/verify-otp', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { phone, otp } = req.body;

        if (!phone || !otp) return res.status(400).json({ error: 'Telefone e código são obrigatórios' });

        const customer = await customersRepo.getCustomerByPhone(tenantId, phone);

        if (!customer || customer.otp_code !== otp) {
            return res.status(401).json({ error: 'Código inválido ou telefone incorreto' });
        }

        const expiresAt = new Date(customer.otp_expires_at);
        if (expiresAt < new Date()) {
            return res.status(401).json({ error: 'Código expirado' });
        }

        // Clear OTP after use
        await customersRepo.updateOTP(tenantId, phone, null as any, new Date(0));

        // Generate JWT
        const token = jwt.sign(
            { id: customer.id, phone: customer.phone, restaurantId: tenantId, role: 'customer' },
            process.env.JWT_SECRET || 'fallback_jwt_secret_123',
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            customer: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email
            }
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
