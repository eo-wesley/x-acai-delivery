import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { aiRouter } from '../ai/ai.router';
import { env } from '../config/env';
import { SCHEMAS } from '../ai/schemas';
import { toolsRegistry } from '../ai/tools/registry';
import { promptGuard } from '../ai/security/prompt.guard';
import { aiCache } from '../ai/cache/ai.cache';
import { aiMetrics } from '../ai/metrics/ai.metrics';
import { ragService } from '../ai/rag/rag.service';
import { PADBASE_SYSTEM_PROMPT } from '../ai/prompts/padbase.system.txt';

const router = Router();

// Middlewares
const aiRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    message: { error: 'Too many requests to AI endpoints, please try again later.' },
});

const reqIdMiddleware = (req: any, res: any, next: any) => {
    req.id = randomUUID();
    console.log(`[AI-API] Request ${req.id} started - ${req.path}`);
    next();
};

router.use(aiRateLimiter);
router.use(reqIdMiddleware);

// Validation Schemas
const chatBodySchema = z.object({
    messages: z.array(
        z.object({
            role: z.enum(['system', 'user', 'assistant']),
            content: z.string(),
        })
    ).min(1),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
});

const jsonBodySchema = chatBodySchema.extend({
    schemaName: z.string(),
});

// F1) POST /ai/chat
router.post('/chat', async (req: any, res: any) => {
    const startTime = Date.now();
    try {
        const data = chatBodySchema.parse(req.body);

        // 1. Check Cache
        const cacheKey = aiCache.generateKey({ path: '/chat', body: req.body });
        if (req.headers['x-ai-cache-bypass'] !== '1') {
            const cached = aiCache.get(cacheKey);
            if (cached) {
                aiMetrics.recordHit(true);
                return res.json({ ...cached, cached: true, requestId: req.id });
            }
        }
        aiMetrics.recordHit(false);

        // 2. Prompt Guard
        const sanitizedMessages = promptGuard.sanitize(data.messages, req.id);

        let messages = sanitizedMessages;

        // 3. RAG Context Injection (if user asks about policies, hours, etc)
        const lastUserMessage = sanitizedMessages.filter(m => m.role === 'user').pop();
        if (lastUserMessage) {
            const context = ragService.retrieveContext(lastUserMessage.content);
            if (context) {
                messages = [
                    { role: 'system' as const, content: context },
                    ...sanitizedMessages
                ];
            }
        }

        // 4. Provider Routing
        const response = await aiRouter.routeChat({
            messages,
            temperature: data.temperature,
            maxTokens: data.maxTokens,
        });

        const latency = Date.now() - startTime;
        aiMetrics.recordProviderCall(response.provider, response.usage?.promptTokens, response.usage?.completionTokens, latency);

        const replyPayload = {
            reply: response.text,
            provider: response.provider,
            model: response.model,
        };

        // Cache result before returning
        aiCache.set(cacheKey, replyPayload);

        res.json({ ...replyPayload, requestId: req.id });

    } catch (error: any) {
        aiMetrics.recordError();
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation Error', details: error.issues });
        }
        console.error(`[AI-API] Chat error [${req.id}]:`, error);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

// F2) POST /ai/json
router.post('/json', async (req: any, res: any) => {
    const startTime = Date.now();
    try {
        const data = jsonBodySchema.parse(req.body);
        const schema = SCHEMAS[data.schemaName];

        if (!schema) {
            return res.status(400).json({ error: `Schema ${data.schemaName} not found in registry.` });
        }

        const cacheKey = aiCache.generateKey({ path: '/json', body: req.body });
        if (req.headers['x-ai-cache-bypass'] !== '1') {
            const cached = aiCache.get(cacheKey);
            if (cached) {
                aiMetrics.recordHit(true);
                return res.json({ ...cached, cached: true, requestId: req.id });
            }
        }
        aiMetrics.recordHit(false);

        const sanitizedMessages = promptGuard.sanitize(data.messages, req.id);
        const schemaDesc = require('../ai/schemas').SCHEMA_DESCRIPTIONS?.[data.schemaName] || 'JSON object';
        const finalMessages = [
            { role: 'system' as const, content: `Você é um extrator JSON estrito. Responda APENAS com um objeto JSON válido correspondente a esta estrutura exata e mais nada: ${schemaDesc}` },
            ...sanitizedMessages
        ];

        let response = await aiRouter.routeChat({
            messages: finalMessages,
            temperature: data.temperature || 0.1, // Low temp for JSON
            maxTokens: data.maxTokens,
            jsonSchema: true,
        });

        let jsonObj;
        try {
            const cleanText = response.text.replace(/```(json)?/g, '').replace(/```/g, '').trim();
            console.log(`[AI-API Debug] Raw JSON Text Responded:`, cleanText);
            jsonObj = JSON.parse(cleanText);
        } catch {
            // 1 Retry with instruction format
            console.warn(`[AI-API] JSON parse failed [${req.id}]. Retrying...`);
            aiMetrics.recordFallback();
            response = await aiRouter.routeChat({
                messages: [
                    ...sanitizedMessages,
                    { role: 'assistant', content: response.text },
                    { role: 'user', content: 'Você retornou string ou markdown inválido. Corrija para um JSON válido nativamente contendo unicamente as chaves requeridas pelo schema.' }
                ],
                temperature: 0.1,
                jsonSchema: true,
            });
            const cleanText = response.text.replace(/```(json)?/g, '').replace(/```/g, '').trim();
            jsonObj = JSON.parse(cleanText);
        }

        const validated = schema.parse(jsonObj);

        const latency = Date.now() - startTime;
        aiMetrics.recordProviderCall(response.provider, response.usage?.promptTokens, response.usage?.completionTokens, latency);

        const replyPayload = {
            reply: validated,
            provider: response.provider,
            model: response.model,
        };

        aiCache.set(cacheKey, replyPayload);
        res.json({ ...replyPayload, requestId: req.id });
    } catch (error: any) {
        aiMetrics.recordError();
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation Error against Schema', details: error.issues });
        }
        console.error(`[AI-API] JSON Gen error [${req.id}]:`, error);
        res.status(500).json({ error: 'JSON Extraction failed' });
    }
});

// F3) POST /ai/tools (The loop engine)
router.post('/tools', async (req: any, res: any) => {
    const startTime = Date.now();
    try {
        const data = chatBodySchema.parse(req.body);
        aiMetrics.recordHit(false); // Do not cache tool workflows directly

        let sanitizedMessages = promptGuard.sanitize(data.messages, req.id);

        // Always inject the powerful PadBase System prompt
        let messages = [
            { role: 'system' as const, content: PADBASE_SYSTEM_PROMPT },
            ...sanitizedMessages
        ];

        let loops = 0;
        const MAX_LOOPS = 3;
        let finalResponse = null;
        let providerUsed = '';

        while (loops < MAX_LOOPS) {
            loops++;

            // Dynamic RAG Injection on every thought
            const lastUserIdMsg = messages.filter(m => m.role === 'user').pop();
            if (lastUserIdMsg) {
                const ctx = ragService.retrieveContext(lastUserIdMsg.content);
                if (ctx) {
                    messages.splice(1, 0, { role: 'system', content: ctx });
                }
            }

            const response = await aiRouter.routeChat({
                messages,
                temperature: 0.1, // Strict temperature for adhering to tool definitions
            });

            providerUsed = response.provider;
            const latency = Date.now() - startTime;
            aiMetrics.recordProviderCall(response.provider, response.usage?.promptTokens, response.usage?.completionTokens, latency);

            messages.push({ role: 'assistant', content: response.text });
            finalResponse = response.text;
            console.log(`[AI-API Debug] Tools Loop ${loops} Text:`, response.text);

            let jsonIntent;
            try {
                const cleanText = response.text.replace(/```(json)?/g, '').replace(/```/g, '').trim();
                jsonIntent = JSON.parse(cleanText);
            } catch {
                // It's not a tool call JSON, so it must be a final conversational answer Break out of loop.
                break;
            }

            // Handle Tool Execution
            if (jsonIntent.tool && toolsRegistry[jsonIntent.tool]) {
                console.log(`[AI-API] Looping: Tool Call => ${jsonIntent.tool} [${req.id}]`);
                try {
                    const toolResult = await toolsRegistry[jsonIntent.tool](jsonIntent.args);
                    messages.push({
                        role: 'user',
                        content: `[TOOL RESPONSE FOR ${jsonIntent.tool}]:\n${JSON.stringify(toolResult)}\n\nProcess this data and reply to the user concisely, or invoke another tool if necessary.`
                    });
                } catch (toolErr: any) {
                    messages.push({
                        role: 'system',
                        content: `[TOOL ERROR FOR ${jsonIntent.tool}]: ${toolErr.message}. Explain the error to the user.`
                    });
                }
            } else {
                // Invalid tool named, break loop
                messages.push({ role: 'system', content: `Tool ${jsonIntent.tool} does not exist.` });
                break;
            }
        }

        res.json({
            reply: finalResponse,
            loopsExecuted: loops,
            provider: providerUsed,
            requestId: req.id
        });

    } catch (error: any) {
        aiMetrics.recordError();
        console.error(`[AI-API] Tools execution fatal error [${req.id}]:`, error);
        res.status(500).json({ error: 'Tool loop extraction failed', rawMessage: error?.message || String(error) });
    }
});

// F4) GET /ai/stats
router.get('/stats', (req: any, res: any) => {
    res.json(aiMetrics.getStats());
});

export default router;
