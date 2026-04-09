# Task

Data: 2026-04-01

## Missao ativa

Fechar o catalogo de producao apos a importacao do iFood e revalidar checkout/Pix com o menu real ja publicado.

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

O catalogo ja foi importado para producao, mas o backend publicado no Render ainda nao devolve `sort_order` corretamente. A ordem visual ficou majoritariamente preservada pela sequencia de criacao, porem ainda precisa ser revalidada apos o proximo redeploy do backend.

## Resultado esperado

- catalogo de producao estabilizado com ordem publica correta
- grupos de opcoes/adicionais preservados no frontend e no admin
- checkout real ate Pix revalidado com o menu ja importado
- trilha da importacao e do rollout permanecendo salva no repo e no GitHub

## Atualizacao desta entrega

- o importador passou a ter caminho recomendado `open` + `run`, com login real no navegador
- o gargalo dos complementos foi atacado abrindo cada item do iFood para forcar os payloads de detalhe
- a captura passou a priorizar `portal.ifood.com.br/menu-list` e a aceitar fallback por snapshot normalizado
- a importacao real em producao foi concluida com 27 produtos, 4 categorias, 33 grupos e 268 opcoes
- o proximo passo operacional agora e redeployar o backend de producao na `main` mais recente e revalidar a ordem publica antes do checkout Pix final
