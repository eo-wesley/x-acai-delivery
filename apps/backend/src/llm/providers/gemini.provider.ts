import { LLMProvider, LLMRequest, LLMResponse } from '../llm.types';

export class GeminiLLMProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateReply(request: LLMRequest): Promise<LLMResponse> {
    try {
      const systemPrompt = `Você é um assistente de atendimento da X-Açaí Delivery.
Ao cliente solicitar ver cardápio, criar pedido, checar status ou cancelar pedido, utilize imperativamente as funções conectadas!
Não invente preços nem status.
Cliente: ${request.context?.customerName || 'Não identificado'}
Última mensagem: "${request.message}"`;

      const tools = [{
        functionDeclarations: [
          {
            name: "getMenu",
            description: "Busca os itens disponíveis no cardápio de açaí com seus preços.",
            parameters: {
              type: "OBJECT",
              properties: { category: { type: "STRING", description: "Opcional. Ex: tigelas, acompanhamentos" } }
            }
          },
          {
            name: "createOrder",
            description: "Cria um novo pedido para o cliente recebendo os IDs dos itens e quantidades, e o endereço.",
            parameters: {
              type: "OBJECT",
              properties: {
                addressText: { type: "STRING", description: "Endereço completo da entrega" },
                items: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      menuItemId: { type: "STRING" },
                      qty: { type: "NUMBER" },
                      notes: { type: "STRING" }
                    }
                  }
                }
              },
              required: ["addressText", "items"] // Customer is inferred from context wrapper
            }
          },
          {
            name: "getOrderStatus",
            description: "Busca o status atual de um pedido usando o telefone do cliente ou ID.",
            parameters: {
              type: "OBJECT",
              properties: { phone: { type: "STRING", description: "Telefone no formato string" } }
            }
          }
        ]
      }];

      const payload = {
        contents: [{ role: 'user', parts: [{ text: request.message }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools,
        generationConfig: { maxOutputTokens: 250, temperature: 0.2 },
      };

      const { toolsRegistry } = await import('../../ai/tools/registry');

      const response = await fetch(`${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Gemini API error');
      const data = await response.json() as any;

      const part = data.candidates?.[0]?.content?.parts?.[0];

      // Handle Tool Call
      if (part?.functionCall) {
        const fnName = part.functionCall.name;
        const fnArgs = part.functionCall.args || {};

        console.log(`[Gemini] Model requested tool: ${fnName}`);

        if (fnName === 'createOrder' && request.phone) {
          fnArgs.customer = { phone: request.phone, name: request.context?.customerName || 'Cliente' };
        }
        if (fnName === 'getOrderStatus' && request.phone && !fnArgs.phone) {
          fnArgs.phone = request.phone;
        }

        const toolFunc = toolsRegistry[fnName];
        if (toolFunc) {
          const toolResult = await toolFunc(fnArgs);
          return {
            text: `[SISTEMA INTERNO]: Ação "${fnName}" executada com sucesso.\nResultado: ${JSON.stringify(toolResult)}\nRepasse isso ao cliente amigavelmente.`,
            provider: 'gemini_tool'
          };
        }
      }

      return {
        text: part?.text || 'Desculpe, não entendi.',
        provider: 'gemini',
      };
    } catch (error) {
      console.error('Gemini error:', error);
      return {
        text: 'Desculpe, estamos com dificuldades técnicas. Por favor, tente novamente.',
        provider: 'gemini-error',
      };
    }
  }
}
