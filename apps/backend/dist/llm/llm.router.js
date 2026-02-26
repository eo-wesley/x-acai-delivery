"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMRouter = void 0;
const mock_provider_1 = require("./providers/mock.provider");
const gemini_provider_1 = require("./providers/gemini.provider");
class LLMRouter {
    constructor() {
        const llmProvider = process.env.LLM_PROVIDER || 'mock';
        const geminiKey = process.env.GEMINI_API_KEY;
        const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        if (llmProvider === 'gemini' && geminiKey) {
            console.log('✓ Using Gemini LLM provider');
            this.provider = new gemini_provider_1.GeminiLLMProvider(geminiKey, geminiModel);
        }
        else {
            console.log('✓ Using Mock LLM provider (fallback)');
            this.provider = new mock_provider_1.MockLLMProvider();
        }
    }
    getProvider() {
        return this.provider;
    }
}
exports.LLMRouter = LLMRouter;
