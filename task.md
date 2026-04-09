# Task

Data: 2026-04-01

## Missao ativa

Fechar a consistencia final do catalogo de producao para `Monte O Seu` e `Copos da Promocao`, garantindo que grupos/opcoes e quantidades gratis batam com o iFood antes da aprovacao final do Pix real.

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

Depois da correcao de UX do produto, ainda sobrava um desvio real no catalogo publicado:

- `Acaí X-King Pacoca` estava sem o grupo premium
- `Acaí Marmitex 700ml Grátis 4 Complementos` estava sem um dos grupos
- todos os grupos `Acompanhamentos (Escolha N)` do `Monte O Seu` estavam com `min_select = 1`, o que liberava quantidade errada no frontend

## Resultado esperado

- categorias `Acaí Monte O Seu` e `Acaí Copos da Promocao` exatamente iguais ao snapshot do iFood
- grupos `Escolha N` exigindo a quantidade exata no frontend publico
- checkout e persistencia de `selected_options` preservados
- trilha da reconciliacao salva no repo e no GitHub

## Atualizacao desta entrega

- o importador ganhou `reconcile-options` para exact sync de grupos/opcoes em menu ja publicado
- os 2 mismatches restantes foram corrigidos em producao
- os 10 grupos `Acompanhamentos (Escolha N)` do `Monte O Seu` foram atualizados para selecao exata
- a verificacao final programatica chegou a `0 mismatches`
- dois pedidos reais de prova confirmaram persistencia correta de `selected_options`
- o proximo passo volta a ser a validacao final do Pix aprovado com o catalogo agora consistente
