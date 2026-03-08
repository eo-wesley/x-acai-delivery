import { AIProvider, ChatOptions, ChatResponse } from './providers/provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { VertexProvider } from './providers/vertex.provider';
import { env } from '../config/env';

// Track circuit breaker states
interface CircuitState {
    failures: number;
    lastFailureTime: number;
    status: 'open' | 'closed'; // Open = failing currently out of service
}

export class AIRouter {
    private providers: Record<string, AIProvider> = {};
    private circuits: Record<string, CircuitState> = {};

    // Circuit Breaker constants Configuration 
    private readonly MAX_FAILURES = 3;
    private readonly FAILURE_WINDOW_MS = 60000; // 60 seconds
    private readonly PAUSE_DURATION_MS = 30000; // 30 seconds wait

    constructor() {
        this.providers['gemini'] = new GeminiProvider();
        this.providers['groq'] = new GroqProvider();
        this.providers['ollama'] = new OllamaProvider();
        this.providers['vertex'] = new VertexProvider();

        // Initialize circuit states
        Object.keys(this.providers).forEach(key => {
            this.circuits[key] = { failures: 0, lastFailureTime: 0, status: 'closed' };
        });
    }

    private isCircuitOpen(providerKey: string): boolean {
        const state = this.circuits[providerKey];
        if (state.status === 'open') {
            const timeSinceFailure = Date.now() - state.lastFailureTime;
            if (timeSinceFailure > this.PAUSE_DURATION_MS) {
                // Trip half-open, let's try again
                state.status = 'closed';
                state.failures = 0;
                return false;
            }
            return true;
        }
        return false;
    }

    private recordFailure(providerKey: string) {
        const state = this.circuits[providerKey];
        const now = Date.now();

        // Reset failures if outside window
        if (now - state.lastFailureTime > this.FAILURE_WINDOW_MS) {
            state.failures = 0;
        }

        state.failures += 1;
        state.lastFailureTime = now;

        if (state.failures >= this.MAX_FAILURES) {
            console.error(`🚨 [Circuit Breaker] Tripped for ${providerKey}. Pausing usage for ${this.PAUSE_DURATION_MS}ms.`);
            state.status = 'open';
        }
    }

    private recordSuccess(providerKey: string) {
        const state = this.circuits[providerKey];
        if (state.failures > 0) {
            state.failures = 0;
            state.status = 'closed';
        }
    }

    async routeChat(options: ChatOptions): Promise<ChatResponse> {
        let strategy = env.ACTIVE_PROVIDER;

        // Force a mock provider to stop crashes from halting the app entirely if set
        if (strategy === 'mock' || !strategy) {
            return {
                text: 'Você está em mock mode. Configure GEMINI_API_KEY ou AI_PROVIDER no .env para habilitar inteligência real.',
                provider: 'mock',
                model: 'mocked',
            }
        }

        if (strategy !== 'auto') {
            const provider = this.providers[strategy];
            if (!provider) throw new Error(`Provider ${strategy} not found.`);

            // Standard route with isolated circuit checks but no fallback
            if (this.isCircuitOpen(strategy)) {
                throw new Error(`[Circuit Breaker] ${strategy} is currently OPEN and unavailable. Try again later.`);
            }

            try {
                const res = await provider.chat(options);
                this.recordSuccess(strategy);
                // Metrics will be injected dynamically
                return res;
            } catch (err) {
                this.recordFailure(strategy);
                throw err;
            }
        }

        // --- Auto strategy (cascade fallback) ---
        const cascadeList = ['gemini', 'groq', 'ollama'];
        let lastError: Error | null = null;

        for (const provKey of cascadeList) {
            // Skip if API key missing for Groq or if Circuit broke 
            if (provKey === 'groq' && !env.GROQ_API_KEY) continue;
            if (provKey === 'ollama' && env.NODE_ENV !== 'development') continue; // Only local dev for Ollama
            if (this.isCircuitOpen(provKey)) {
                console.warn(`[AutoRouter] Skipping ${provKey} because Circuit is OPEN`);
                continue;
            }

            try {
                const res = await this.providers[provKey].chat(options);
                this.recordSuccess(provKey);
                // Note: we'll emit metrics later outside this function using the response obj
                return res;
            } catch (error: any) {
                this.recordFailure(provKey);
                lastError = error;
                console.warn(`[AutoRouter] ⚠️ Fallback triggered due to ${provKey} error: ${error.message}`);
                // Loop to next provider...
            }
        }

        throw new Error(`All auto fallback providers failed. Last Error: ${lastError?.message}`);
    }
}

export const aiRouter = new AIRouter();
