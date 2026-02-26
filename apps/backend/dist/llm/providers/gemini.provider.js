"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiLLMProvider = void 0;
class GeminiLLMProvider {
    constructor(apiKey, model = 'gemini-1.5-flash') {
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.apiKey = apiKey;
        this.model = model;
    }
    async generateReply(request) {
        try {
            const systemPrompt = `Você é um assistente de atendimento da X-Açaí Delivery. 
Responda de forma breve e amigável em português.
Cliente: ${request.context?.customerName || 'Não identificado'}
Última mensagem: "${request.message}"`;
            const response = await fetch(`${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: request.message }],
                        },
                    ],
                    systemInstruction: {
                        parts: [{ text: systemPrompt }],
                    },
                    generationConfig: {
                        maxOutputTokens: 150,
                        temperature: 0.7,
                    },
                }),
            });
            if (!response.ok) {
                console.error('Gemini API error:', response.status, response.statusText);
                throw new Error('Gemini API error');
            }
            const data = (await response.json());
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text ||
                'Desculpe, não consegui processar sua solicitação.';
            return {
                text,
                provider: 'gemini',
            };
        }
        catch (error) {
            console.error('Gemini error:', error);
            // Fallback response
            return {
                text: 'Desculpe, estamos com dificuldades técnicas. Por favor, tente novamente.',
                provider: 'gemini-error',
            };
        }
    }
}
exports.GeminiLLMProvider = GeminiLLMProvider;
