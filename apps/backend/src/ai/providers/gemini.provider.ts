import { AIProvider, ChatOptions, ChatResponse } from './provider.interface';
import { env } from '../../config/env';

export class GeminiProvider implements AIProvider {
    name = 'gemini';
    supportsTools = true;

    async chat(options: ChatOptions): Promise<ChatResponse> {
        const apiKey = env.GEMINI_API_KEY || '';
        const model = env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Extraimos a instrução de sistema global
        const systemInstruction = options.messages.find(m => m.role === 'system')?.content;

        // O histórico em si
        const contents = options.messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        const payload: any = {
            contents,
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxTokens ?? env.AI_MAX_OUTPUT_TOKENS,
            }
        };

        if (systemInstruction) {
            payload.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        //      if (options.jsonSchema) {
        //          payload.generationConfig.responseMimeType = "application/json";
        //      }

        const timeoutMs = options.timeoutMs ?? env.AI_TIMEOUT_MS;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeout);
            const data = await response.json() as any;

            if (!response.ok) {
                throw new Error(`[${response.status}] HTTP falhou: ${JSON.stringify(data, null, 2)}`);
            }

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('Gemini API retornou uma resposta vazia.');
            }

            const text = data.candidates[0]?.content?.parts?.[0]?.text || '';
            const usage = data.usageMetadata;

            return {
                text,
                provider: this.name,
                model,
                raw: data,
                usage: usage ? {
                    promptTokens: usage.promptTokenCount,
                    completionTokens: usage.candidatesTokenCount,
                    totalTokens: usage.totalTokenCount
                } : undefined
            };

        } catch (error: any) {
            console.error('[Gemini] Chat fetch error:', error.message);
            if (error.name === 'AbortError') {
                throw new Error(`[Gemini] Timeout: Demorou mais que ${timeoutMs}ms`);
            }
            throw error;
        }
    }
}
