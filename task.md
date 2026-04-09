# Task

Data: 2026-04-01

## Missao ativa

Publicar e validar o frontend de producao com os complementos do `Monte O Seu` visiveis na mesma tela do produto, sem wizard por etapas.

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

Os complementos do `Monte O Seu` ja existiam no backend de producao, mas a UX do frontend escondia tudo atras de um fluxo em etapas, passando a impressao de que os adicionais nao tinham sido importados.

## Resultado esperado

- itens do `Monte O Seu` exibindo todos os grupos de opcoes na mesma tela
- CTA final bloqueado somente enquanto faltarem selecoes obrigatorias
- carrinho e checkout preservando `selected_options`
- trilha do ajuste de frontend salva no repo e no GitHub

## Atualizacao desta entrega

- foi confirmado que os 10 itens de `Acai Monte O Seu` ja tem 2 grupos e 18 opcoes no backend de producao
- a tela `product/[id]` foi simplificada para renderizar todos os grupos em lista continua
- o resumo do produto, quantidade, observacoes e CTA final agora convivem na mesma tela
- o proximo passo operacional passa a ser o deploy automatico do frontend na Vercel e a revalidacao visual do fluxo publicado
