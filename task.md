# Task

Data: 2026-04-01

## Missao ativa

Destravar a validacao real do Pix em producao populando o catalogo do app com o cardapio do iFood, na ordem exata, usando sessao autenticada do navegador e escrita via rotas oficiais do admin.

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

O frontend publico e o backend de producao ja estao online, mas o menu de producao segue vazio. Sem produtos cadastrados, nao da para concluir pedido real e validar o Pix ponta a ponta no app publico.

## Resultado esperado

- catalogo de producao preenchido com os itens do iFood na ordem correta
- grupos de opcoes/adicionais importados pelo caminho oficial do admin
- primeiro checkout real destravado no frontend publico
- trilha da importacao e do rollout permanecendo salva no repo e no GitHub

## Atualizacao desta entrega

- o importador passou a ter caminho recomendado `open` + `run`, com login real no navegador
- o gargalo dos complementos foi atacado abrindo cada item do iFood para forcar os payloads de detalhe
- o proximo passo operacional agora e executar a importacao autenticada em producao
