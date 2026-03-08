import { AIProvider, ChatOptions, ChatResponse } from './provider.interface';

/**
 * TODO: Vertex AI Provider
 * 
 * QUANDO TIVER BILLING ATIVADO:
 * 1. Substitua a AI_PROVIDER no seu .env para `vertex`
 * 2. Preencha as credenciais do Google Cloud Application Default Credentials (ADC)
 * 3. Implemente a lógica usando @google-cloud/vertexai
 * 
 * Este stub mantem a arquitetura pronta para migração com zero refatoração global das rotas.
 */
export class VertexProvider implements AIProvider {
    name = 'vertex';
    supportsTools = true;

    async chat(options: ChatOptions): Promise<ChatResponse> {
        throw new Error('VertexProvider is not implemented yet. Enable GCP Billing and implement this stub.');
    }
}
