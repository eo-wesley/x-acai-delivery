# Task

Data: 2026-04-01

## Missao ativa

Fechar a ultima validacao manual de pagamento em producao e deixar o rollout final pronto com catalogo, Pix e operacao documentados.

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

O catalogo ja foi importado para producao e o redeploy do backend ja refletiu `sort_order` corretamente. O ponto que sobra agora e so a prova final do pagamento aprovado em ambiente real de producao.

## Resultado esperado

- catalogo de producao estabilizado com ordem publica correta
- grupos de opcoes/adicionais preservados no frontend e no admin
- checkout real ate a tela Pix ja revalidado com o menu importado
- proximo passo manual minimo reduzido a aprovar um Pix real para comprovar `paid/confirmed` em producao
- trilha da importacao e do rollout permanecendo salva no repo e no GitHub

## Atualizacao desta entrega

- o importador passou a ter caminho recomendado `open` + `run`, com login real no navegador
- o gargalo dos complementos foi atacado abrindo cada item do iFood para forcar os payloads de detalhe
- a captura passou a priorizar `portal.ifood.com.br/menu-list` e a aceitar fallback por snapshot normalizado
- a importacao real em producao foi concluida com 27 produtos, 4 categorias, 33 grupos e 268 opcoes
- o backend de producao ja voltou a refletir `sort_order` corretamente nas rotas admin/publicas
- o checkout de producao ja gerou um Pix real pendente com `payment_reference` valido
- a proxima acao fica restrita a aprovar um pagamento real para fechar a prova final de webhook/status em producao
