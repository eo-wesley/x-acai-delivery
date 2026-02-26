"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockLLMProvider = void 0;
class MockLLMProvider {
    async generateReply(request) {
        // Simulate LLM response
        const responses = [
            `Olá ${request.context?.customerName || 'Cliente'}! Obrigado pela sua mensagem. Estamos processando seu pedido.`,
            'Recebemos sua solicitação! Em breve entraremos em contato.',
            'Qual é sua dúvida? Estou aqui para ajudar!',
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        return {
            text: randomResponse,
            provider: 'mock',
        };
    }
}
exports.MockLLMProvider = MockLLMProvider;
