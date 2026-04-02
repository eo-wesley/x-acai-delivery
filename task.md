# Task

Data: 2026-04-01

## Missao ativa

Publicar o backend de producao no Render usando o banco Neon ja provisionado, sem quebrar staging, SQLite local ou os fluxos ja validados.

## Contexto confirmado

- staging backend online no Render
- banco de staging em PostgreSQL no Neon
- admin autenticando com Firebase
- menu admin e menu publico funcionando
- Pix sandbox real funcionando com webhook
- pedido pago mudando para `paid` / `confirmed`
- frontend pronto para deploy remoto separado do backend
- staging mantido com `WHATSAPP_PROVIDER=mock` por falta de Evolution publica confirmada
- WhatsApp real local validado com Evolution
- banco de producao provisionado no Neon com migration aplicada

## Problema concreto atacado nesta etapa

O banco de producao ja esta pronto, mas o backend de producao ainda nao foi provisionado no Render com as variaveis reais de Firebase, Mercado Pago e base de dados.

## Resultado esperado

- backend de producao publicado com `/health` respondendo
- contrato de variaveis do Render validado
- base de producao Neon ligada ao backend com seguranca
- trilha do rollout permanecendo salva no repo e no GitHub
