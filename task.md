# Task

Data: 2026-04-01

## Missao ativa

Concluir a validacao real do backend de producao no Render, tirando o Pix do fallback mock e fechando o smoke autenticado do admin antes de avancar para o frontend de producao.

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

O backend de producao ja esta online e conectado ao banco Neon, mas o fluxo de Pix ainda cai em `mock_...` e o smoke autenticado do admin ainda depende de um Firebase ID token valido do projeto de producao.

## Resultado esperado

- backend de producao respondendo com Pix real
- contrato de variaveis do Render confirmado em producao
- rota admin protegida validada com token Firebase real
- trilha do rollout permanecendo salva no repo e no GitHub
