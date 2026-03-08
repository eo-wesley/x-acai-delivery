import { z } from 'zod';
import { AIProvider, ChatOptions, ChatResponse } from './provider.interface';
import { env } from '../../config/env';

export class GroqProvider implements AIProvider {
    name = 'groq';
    supportsTools = true;

    async chat(options: ChatOptions): Promise<ChatResponse> {
        if (!env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY is not defined.');
        }

        const abortController = new AbortController();
        const timeoutMs = options.timeoutMs ?? env.AI_TIMEOUT_MS;
        const timeout = setTimeout(() => abortController.abort(), timeoutMs);

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    // Move system prompt directly into the messages payload like OpenAI spec
                    messages: options.messages,
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.maxTokens ?? env.AI_MAX_OUTPUT_TOKENS,
                    response_format: options.jsonSchema ? { type: 'json_object' } : undefined,
                }),
                signal: abortController.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`[${response.status}] ${errBody}`);
            }

            const data: any = await response.json();
            return {
                text: data.choices[0]?.message?.content || '',
                provider: this.name,
                model: data.model,
                raw: data,
                usage: {
                    promptTokens: data.usage?.prompt_tokens,
                    completionTokens: data.usage?.completion_tokens,
                    totalTokens: data.usage?.total_tokens
                },
            };
        } catch (error: any) {
            clearTimeout(timeout);
            if (error.name === 'AbortError') {
                throw new Error(`[Groq] Timeout: Demorou mais que ${timeoutMs}ms`);
            }
            console.error('[Groq] Chat fetch error:', error.message);
            throw error;
        }
    }
}
