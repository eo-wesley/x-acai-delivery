import { LLMProvider, LLMRequest, LLMResponse } from '../llm.types';

export class MockLLMProvider implements LLMProvider {
  async generateReply(request: LLMRequest): Promise<LLMResponse> {
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
