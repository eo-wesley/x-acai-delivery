"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhookRouter = (0, express_1.Router)();
webhookRouter.get('/webhook', (req, res) => {
    res.status(200).send('ok');
});
webhookRouter.post('/webhook', async (req, res) => {
    res.status(200).json({ received: true });
});
exports.default = webhookRouter;
