export interface Document {
    id: string;
    type: string;
    content: string;
    tags: string[];
}

export const inMemoryKB: Document[] = [
    {
        id: 'faq_1',
        type: 'faq',
        content: 'Nossa loja X-Açaí funciona de Terça a Domingo, das 14h às 23h. Não abrimos às Segundas-feiras. O tempo limite padrão de entrega para o centro é de 40 minutos.',
        tags: ['horario', 'funcionamento', 'tempo', 'entrega', 'limite']
    },
    {
        id: 'pol_1',
        type: 'policy',
        content: 'Aceitamos pagamentos via PIX ou Cartão (Crédito/Débito) na entrega. Não aceitamos VR ou VA no momento. Cancelamentos só são aceitos antes de o status alterar para Entregando.',
        tags: ['pagamento', 'cancelamento', 'pix', 'cartão']
    },
    {
        id: 'promo_1',
        type: 'promo',
        content: 'Nas quartas-feiras oferecemos borda recheada de leite condensado gratuita nos açaís de 700ml ou mais. Em dias de chuva o frete possui acréscimo de 2 reais.',
        tags: ['promocao', 'chuva', 'frete', 'quarta']
    }
];
