interface AIMetricsData {
    totalRequests: number;
    cacheHits: number;
    fallbacks: number;
    errors: number;
    providerCalls: Record<string, number>;
    totalTokensIn: number;
    totalTokensOut: number;
    recentLatenciesMs: number[];
    startTime: number;
}

export class AIMetrics {
    private data: AIMetricsData = {
        totalRequests: 0,
        cacheHits: 0,
        fallbacks: 0,
        errors: 0,
        providerCalls: { gemini: 0, groq: 0, ollama: 0, vertex: 0 },
        totalTokensIn: 0,
        totalTokensOut: 0,
        recentLatenciesMs: [],
        startTime: Date.now()
    };

    recordHit(cached: boolean) {
        this.data.totalRequests++;
        if (cached) this.data.cacheHits++;
    }

    recordProviderCall(provider: string, tokensIn?: number, tokensOut?: number, latencyMs?: number) {
        if (!this.data.providerCalls[provider]) {
            this.data.providerCalls[provider] = 0;
        }
        this.data.providerCalls[provider]++;

        if (tokensIn) this.data.totalTokensIn += tokensIn;
        if (tokensOut) this.data.totalTokensOut += tokensOut;

        if (latencyMs) {
            this.data.recentLatenciesMs.push(latencyMs);
            if (this.data.recentLatenciesMs.length > 100) {
                this.data.recentLatenciesMs.shift();
            }
        }
    }

    recordFallback() {
        this.data.fallbacks++;
    }

    recordError() {
        this.data.errors++;
    }

    getStats() {
        // Compute average latency
        let avgLatency = 0;
        if (this.data.recentLatenciesMs.length > 0) {
            const sum = this.data.recentLatenciesMs.reduce((a, b) => a + b, 0);
            avgLatency = Math.round(sum / this.data.recentLatenciesMs.length);
        }

        return {
            uptimeMinutes: ((Date.now() - this.data.startTime) / 60000).toFixed(2),
            totalRequests: this.data.totalRequests,
            cacheHits: this.data.cacheHits,
            cacheHitRate: this.data.totalRequests > 0
                ? `${Math.round((this.data.cacheHits / this.data.totalRequests) * 100)}%`
                : '0%',
            errors: this.data.errors,
            fallbacks: this.data.fallbacks,
            totalTokensIn: this.data.totalTokensIn,
            totalTokensOut: this.data.totalTokensOut,
            estimatedTokenCostsStr: `Check provider panel. Tokens tracked: ${this.data.totalTokensIn + this.data.totalTokensOut}`,
            providerCalls: this.data.providerCalls,
            avgLatencyMs: avgLatency
        };
    }
}

export const aiMetrics = new AIMetrics();
