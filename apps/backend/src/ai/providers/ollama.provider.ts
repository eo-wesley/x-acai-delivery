import { AIProvider, ChatOptions, ChatResponse } from './provider.interface';
import { env } from '../../config/env';

export class OllamaProvider implements AIProvider {
    name = 'ollama';
    supportsTools = true;

    async chat(options: ChatOptions): Promise<ChatResponse> {
        const abortController = new AbortController();
        const timeoutMs = options.timeoutMs ?? env.AI_TIMEOUT_MS;
        const timeout = setTimeout(() => abortController.abort(), timeoutMs);

        try {
            const response = await fetch(`${env.OLLAMA_HOST}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama3.2', // Lightweight base fast local model
                    messages: options.messages,
                    stream: false,
                    options: {
                        temperature: options.temperature ?? 0.7,
                        num_predict: options.maxTokens ?? env.AI_MAX_OUTPUT_TOKENS,
                    },
                    format: options.jsonSchema ? 'json' : undefined,
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
                text: data.message?.content || '',
                provider: this.name,
                model: data.model,
                raw: data,
                usage: {
                    promptTokens: data.prompt_eval_count,
                    completionTokens: data.eval_count,
                    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
                }
            };
        } catch (error: any) {
            clearTimeout(timeout);
            if (error.name === 'AbortError') {
                throw new Error(`[Ollama] Timeout: Demorou mais que ${timeoutMs}ms`);
            }
            console.error('[Ollama] Chat fetch error:', error.message);
            throw error;
        }
    }
}
