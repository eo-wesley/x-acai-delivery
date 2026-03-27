# Backlog Estratégico X-Açaí Development

Este documento consolida o estado atual do projeto e as próximas missões prioritárias para o lançamento comercial (Go-To-Market).

## ✅ Estado Atual (Concluído e Validado)
- **Fluxo de Pedidos E2E**: Ciclo completo de pedido funcional entre PWA e Admin.
- **Autenticação Admin**: Acesso seguro ao painel administrativo via Firebase.
- **Legibilidade Operacional**: Dashboard exibe nomes legíveis em vez de UUIDs técnicos.
- **Integração Pix (Backend)**: Geração de QR Code e Payload via Mercado Pago operacional.
- **Confirmação Automática (Webhook)**: Pedidos marcados como `paid` via callback do Mercado Pago.
- **Visibilidade de Pagamento**: Status de pagamento (Pago/Pendente) visível em tempo real no Admin.

---

## 🚀 Próximas Missões (Backlog Priorizado)

### 1. UX & Conversão (PWA do Cliente)
*Foco: Garantir que o cliente pague com facilidade e veja o sucesso.*
- [ ] **Interface Pix**: Implementar botão "Copiar Código Pix" (Clipboard API) na tela de pagamento.
- [ ] **Feedback em Tempo Real**: Garantir que a tela do cliente mude para "Pagamento Confirmado/Sucesso" automaticamente assim que o webhook for processado (sem refresh manual).
- [ ] **Polimento Visual**: Ajustar layout Mobile do QR Code para máxima legibilidade.

### 2. Infraestrutura de Dados (Produção)
*Foco: Sair do SQLite para um banco de dados profissional.*
- [ ] **Migração PostgreSQL**: Configurar conexão com Neon.tech ou Supabase no Backend.
- [ ] **Ajuste de Dialeto**: Validar que todas as queries SQL complexas (Relatórios) são compatíveis com Postgres.
- [ ] **Deploy de Staging**: Rodar o backend em ambiente cloud (Railway/Render) conectado ao novo banco.

### 3. Mensageria & Notificações (Real-world)
*Foco: Transmitir confiança ao cliente via WhatsApp.*
- [ ] **Ativação Evolution API**: Substituir o `MockWhatsAppService` pela integração real com instância Docker.
- [ ] **Notificações Transacionais**: Disparo automático de WhatsApp para:
  - Pedido Recebido (Confirmação).
  - Pagamento Aprovado.
  - Pedido saiu para entrega.

### 4. Segurança & Deploy Final
*Foco: Hardening do sistema para o primeiro cliente pagante.*
- [ ] **Saneamento de Variáveis Cloud**: Mover chaves sensíveis (Firebase Admin, Mercado Pago Prod) para o Secret Manager do provedor de cloud.
- [ ] **Validação HTTPS**: Confirmar que o fluxo de Webhooks funciona sob SSL real para evitar rejeições do Mercado Pago em produção.

---
*Assinado: Antigravity IA Sênior - 27 de Março de 2026*
