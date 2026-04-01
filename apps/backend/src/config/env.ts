import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: z.string().default('*'),

    // Deployment & Payment
    NEXT_PUBLIC_API_URL: z.string().optional(),
    PAYMENT_API_KEY: z.string().optional(),
    MP_ACCESS_TOKEN: z.string().optional(),
    MP_WEBHOOK_URL: z.string().optional(),

    // WhatsApp Notification Provider
    WHATSAPP_PROVIDER: z.enum(['mock', 'meta', 'evolution']).default('mock'),
    WHATSAPP_API_KEY: z.string().optional(),     // Evolution API key
    WHATSAPP_BASE_URL: z.string().optional(),    // Evolution API base URL
    WHATSAPP_INSTANCE: z.string().optional(),   // Evolution instance name
    WHATSAPP_TOKEN: z.string().optional(),       // Meta Cloud API token (legacy)
    WHATSAPP_PHONE_ID: z.string().optional(),    // Meta phone_number_id (legacy)


    // AI Configuration
    AI_PROVIDER: z.enum(['gemini', 'groq', 'ollama', 'vertex', 'auto', 'mock']).optional(),
    LLM_PROVIDER: z.enum(['gemini', 'groq', 'ollama', 'vertex', 'auto', 'mock']).optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
    GROQ_API_KEY: z.string().optional(),
    OLLAMA_HOST: z.string().default('http://localhost:11434'),

    // AI Safety & Tuning
    AI_TIMEOUT_MS: z.coerce.number().default(20000),
    AI_MAX_OUTPUT_TOKENS: z.coerce.number().default(800),

    // Rate Limiting for AI endpoints
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
    RATE_LIMIT_MAX: z.coerce.number().default(30),

    // AI Cache TTL Settings
    AI_CACHE_TTL_DEFAULT_SEC: z.coerce.number().default(120),
    AI_CACHE_TTL_MENU_SEC: z.coerce.number().default(600),
    AI_CACHE_TTL_INFO_SEC: z.coerce.number().default(3600),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Configuração inválida no .env:', parsed.error.format());
    process.exit(1);
}

// Compute the active strategy resolving LLM_PROVIDER as alias
const activeProvider = parsed.data.AI_PROVIDER || parsed.data.LLM_PROVIDER || (parsed.data.GEMINI_API_KEY ? 'gemini' : 'mock');

export const env = {
    ...parsed.data,
    ACTIVE_PROVIDER: activeProvider
};
