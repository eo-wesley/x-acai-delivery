# Task

Data: 2026-04-01

## Missao ativa

Normalizar o status `confirmed` no fluxo operacional depois da aprovacao Pix em staging, sem quebrar o que ja foi validado em backend, frontend admin, Firebase, PostgreSQL e Mercado Pago.

## Contexto confirmado

- staging backend online no Render
- banco de staging em PostgreSQL no Neon
- admin autenticando com Firebase
- menu admin e menu publico funcionando
- Pix sandbox real funcionando com webhook
- pedido pago mudando para `paid` / `confirmed`

## Problema concreto atacado nesta etapa

O backend atualiza o pedido para `confirmed` apos o webhook do Pix, mas parte do admin ainda tratava apenas `pending`, `accepted`, `preparing` e `delivering`. Isso criava ruido operacional:

- pedido pago podia aparecer com status cru
- pedido pago podia sumir da cozinha
- KPIs podiam subcontar pedidos pagos aguardando preparo

## Resultado esperado

- admin enxergando `confirmed` como pedido novo pago
- cozinha/KDS enxergando `confirmed`
- dashboard e live hub contando esse estado corretamente
- trilha de continuidade do projeto registrada em arquivos simples de repo
