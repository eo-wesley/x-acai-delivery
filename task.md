# Task

Data: 2026-04-01

## Missao ativa

Consolidar a transicao final entre staging e producao, com checklist objetivo de deploy para backend, frontend, banco, Firebase, Mercado Pago, dominio e WhatsApp.

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

## Problema concreto atacado nesta etapa

O produto ja passou pelas validacoes tecnicas principais, mas ainda faltava transformar esse estado em um plano de producao seguro e reutilizavel, sem depender de memoria de sessao ou contexto perdido.

## Resultado esperado

- saber exatamente o que ja esta pronto para producao
- saber exatamente o que ainda falta
- ter uma sequencia final clara para backend, frontend, banco, Firebase, Mercado Pago, webhook, dominio e WhatsApp
- deixar essa trilha salva no repo e no GitHub
