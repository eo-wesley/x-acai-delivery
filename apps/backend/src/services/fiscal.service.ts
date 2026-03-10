import { fiscalRepo } from '../db/repositories/fiscal.repo';
import { ordersRepo } from '../db/repositories/orders.repo';
import { logger } from '../core/logger';

export class FiscalService {
    /**
     * Gera o payload de NFCe baseado no pedido e dados do restaurante.
     * Segue o padrão simplificado de muitos provedores brasileiros (Focus NFe, etc).
     */
    static async generateNfcePayload(orderId: string, tenantId: string) {
        const order = await ordersRepo.getOrderById(orderId);
        const config = await fiscalRepo.getRestaurantFiscalConfig(tenantId);

        if (!order || !config) throw new Error('Pedido ou Configuração Fiscal não encontrada.');

        // Extrai itens (supondo que order.items_json exista)
        const items = JSON.parse(order.items_json || '[]');

        const payload = {
            natureza_operacao: 'Venda de mercadoria',
            data_emissao: new Date().toISOString(),
            tipo_documento: 1, // 1=Saída
            finalidade_emissao: 1, // 1=Normal
            cpf_destinatario: order.tax_id || null,
            nome_destinatario: order.customer_name,
            logradouro_destinatario: order.address_text,
            numero_destinatario: 'S/N',
            bairro_destinatario: 'Centro',
            municipio_destinatario: 'Cidade Exemplo',
            uf_destinatario: 'SP',
            valor_total: order.total_cents / 100,
            forma_pagamento: order.payment_method === 'online' ? '03' : '01', // 03=Cartão, 01=Dinheiro
            items: items.map((item: any, idx: number) => ({
                numero_item: idx + 1,
                codigo_produto: item.id,
                descricao: item.name,
                cfop: '5102', // Venda de mercadoria
                unidade_comercial: 'UN',
                quantidade_comercial: item.quantity,
                valor_unitario_comercial: item.price_cents / 100,
                valor_bruto: (item.price_cents * item.quantity) / 100,
                icms_situacao_tributaria: '102', // Simples Nacional
                pis_situacao_tributaria: '07',
                cofins_situacao_tributaria: '07'
            }))
        };

        return { payload, config };
    }

    /**
     * Emite a nota fiscal (Simulação)
     */
    static async issueInvoice(orderId: string, tenantId: string) {
        try {
            const { payload, config } = await this.generateNfcePayload(orderId, tenantId);

            logger.info(`Emitindo nota para pedido ${orderId} no ambiente ${config.fiscal_environment}`);

            // SIMULAÇÃO DE CHAMADA EXTERNA
            // Em uma implementação real: 
            // const response = await fetch('https://api.focusnfe.com.br/v2/nfce', { ... });

            await new Promise(resolve => setTimeout(resolve, 2000)); // Delay simulado

            const nfe_number = `2026${Math.floor(Math.random() * 999999)}`;
            const nfe_url = `https://fiscal.simulado.com.br/v2/nfe/${nfe_number}.pdf`;

            await fiscalRepo.updateOrderFiscal(orderId, {
                status: 'issued',
                nfe_number,
                nfe_url
            });

            return { success: true, nfe_number, nfe_url };
        } catch (e: any) {
            logger.error(`Erro ao emitir nota para pedido ${orderId}: ${e.message}`);
            await fiscalRepo.updateOrderFiscal(orderId, { status: 'error' });
            throw e;
        }
    }
}
