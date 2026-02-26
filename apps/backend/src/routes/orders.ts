import { Router, Request, Response } from 'express';
import { createOrder } from '../store/firestore.client';

const ordersRouter = Router();

interface OrderRequest {
  customerId: string;
  items: Array<{
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
  }>;
  total: number;
  paymentMethod: string;
  address: string;
  notes?: string;
}

ordersRouter.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const orderData = req.body as OrderRequest;

    // Validate required fields
    if (!orderData.customerId || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: customerId, items',
      });
    }

    const orderId = await createOrder(orderData.customerId, orderData);

    res.status(201).json({
      success: true,
      orderId,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      error: 'Failed to create order',
      details: (error as Error).message,
    });
  }
});

export default ordersRouter;
