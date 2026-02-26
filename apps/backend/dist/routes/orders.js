"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_client_1 = require("../store/firestore.client");
const ordersRouter = (0, express_1.Router)();
ordersRouter.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        // Validate required fields
        if (!orderData.customerId || !orderData.items || orderData.items.length === 0) {
            return res.status(400).json({
                error: 'Missing required fields: customerId, items',
            });
        }
        const orderId = await (0, firestore_client_1.createOrder)(orderData.customerId, orderData);
        res.status(201).json({
            success: true,
            orderId,
            message: 'Order created successfully',
        });
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            error: 'Failed to create order',
            details: error.message,
        });
    }
});
exports.default = ordersRouter;
