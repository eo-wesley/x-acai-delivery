# Walkthrough

Data: 2026-04-01

## O que foi revisado para reconstruir o estado

- `PROJECT_STATUS.md`
- `BACKLOG.md`
- commits recentes de `origin/main`
- rotas e middlewares de admin/Firebase
- camada de Pix/webhook
- telas operacionais do admin

## Evidencias encontradas

- `PROJECT_STATUS.md` estava parado em 2026-03-27
- `task.md`, `implementation_plan.md` e `walkthrough.md` nao existiam
- os commits mais recentes em `main` ja confirmavam:
  - PostgreSQL de staging
  - Firebase Admin unificado
  - webhook do Mercado Pago corrigido
  - payment logs ajustados ao schema atual
- o backend usava `confirmed` apos pagamento aprovado
- a interface admin ainda nao tratava `confirmed` como estado operacional completo

## Mudanca aplicada nesta entrega

1. Tela de pedidos:
   - remove transicao manual indevida de `pending_payment`
   - adiciona suporte a `accepted` e `confirmed`
   - permite continuar o fluxo para `preparing`
2. Cozinha/KDS:
   - passa a carregar pedidos `confirmed`
3. Live Hub e KPIs:
   - passam a contar pedidos `confirmed`
4. Documentacao:
   - registra o ponto real do projeto e a missao atual

## Como ler o estado do projeto daqui para frente

- `PROJECT_STATUS.md` = fotografia resumida do produto
- `task.md` = missao ativa
- `implementation_plan.md` = plano aplicado nesta fase
- `walkthrough.md` = trilha de leitura e evidencias
