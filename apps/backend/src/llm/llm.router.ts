import { LLMProvider } from './llm.types';
import { MockLLMProvider } from './providers/mock.provider';
import { GeminiLLMProvider } from './providers/gemini.provider';

export class LLMRouter {
  private provider: LLMProvider;

  constructor() {
    const llmProvider = process.env.LLM_PROVIDER || 'mock';
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    if (llmProvider === 'gemini' && geminiKey) {
      console.log('✓ Using Gemini LLM provider');
      this.provider = new GeminiLLMProvider(geminiKey, geminiModel);
    } else {
      console.log('✓ Using Mock LLM provider (fallback)');
      this.provider = new MockLLMProvider();
    }
  }

  getProvider(): LLMProvider {
    return this.provider;
  }
}

export { LLMProvider, LLMRequest, LLMResponse } from './llm.types';
