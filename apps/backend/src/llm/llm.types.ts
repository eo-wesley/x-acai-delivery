export interface LLMRequest {
  phone: string;
  message: string;
  context?: {
    customerName?: string;
    lastOrder?: Record<string, any>;
    orderId?: string;
  };
}

export interface LLMResponse {
  text: string;
  provider: string;
}

export interface LLMProvider {
  generateReply(request: LLMRequest): Promise<LLMResponse>;
}
