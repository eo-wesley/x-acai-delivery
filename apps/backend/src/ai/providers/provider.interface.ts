export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
    role: Role;
    content: string;
}

export interface ChatOptions {
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    jsonSchema?: any;
    timeoutMs?: number;
}

export interface ChatResponse {
    text: string;
    provider: string;
    model: string;
    raw?: any;
    usage?: any;
}

export interface AIProvider {
    name: string;
    supportsTools: boolean;
    chat(options: ChatOptions): Promise<ChatResponse>;
}
