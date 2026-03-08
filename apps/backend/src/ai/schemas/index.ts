import { z } from 'zod';

export const OrderIntentSchema = z.object({
    intent: z.enum(['create_order', 'track_order', 'menu_question', 'other']),
    confidence: z.number().min(0).max(1),
    entities: z.object({
        productId: z.string().optional(),
        quantity: z.number().optional(),
        orderId: z.string().optional(),
    }).optional(),
});

export const SCHEMAS: Record<string, z.ZodTypeAny> = {
    OrderIntent: OrderIntentSchema,
};

export const SCHEMA_DESCRIPTIONS: Record<string, string> = {
    OrderIntent: `{ "intent": "create_order"|"track_order"|"menu_question"|"other", "confidence": number(0-1), "entities": { "productId": string, "quantity": number, "orderId": string } }`
};
