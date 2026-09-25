# X-Açaí — verificação de acesso e prontidão para vendas

Verificação em 25/09/2026. **Ainda não liberar vendas reais.**

## Acesso

- A prévia estava indisponível porque não havia servidor escutando na porta 3005.
- Reiniciada com Next em `0.0.0.0:3005`; verificada no Chrome em `http://192.168.15.3:3005/`.
- Esse endereço é local: exige celular na mesma rede e computador ligado. Não é o link público da loja.
- Vercel (`https://x-acai-delivery.vercel.app/`) responde HTTP 200, mas a API está indisponível.
- `https://x-acai-production-backend.onrender.com/health` retornou HTTP 503 / Service Suspended.
- O painel Render abriu no login; foi deixado aberto para autenticação do titular. Nenhuma cobrança, mudança de plano ou credencial foi alterada.

## Verificado nesta rodada

- Monte seu 300 ml exibe massa Açaí/Cupuaçu, onde colocar os itens, três complementos, adicionais, bebida e colher Sim/Não.
- Teste visual: Cupuaçu + dentro do copo + Banana/Granola/Leite Condensado + colher Não chegou à sacola por R$ 35,90 (R$ 30,90 + R$ 5,00).
- Checkout mostra CEP, rua, número, bairro, cidade, UF e complemento. Sem endereço, o frete fica aguardando confirmação.
- Não foi enviado pedido nem realizado pagamento.
- Corrigida regressão do INSERT de pedidos: 29 colunas agora correspondem a 29 valores.
- Corrigida regressão da origem da entrega: coordenadas nulas/vazias não são mais tratadas como zero; resultados geográficos inválidos bloqueiam a cotação.
- 17 testes passaram: nove de opções do cardápio, dois de persistência de pedidos em SQLite em memória e seis de origem/cálculo de entrega com provedores simulados.

## Bloqueios antes de vender

1. Recuperar acesso ao Render e verificar motivo da suspensão, serviço/repositório/branch e configuração. Não contratar plano ou alterar cobrança sem decisão do titular.
2. Corrigir conexão pública: `apps/frontend/next.config.ts` ainda reescreve `/api` para `127.0.0.1:3002`, incompatível com o backend separado no Render.
3. Validar no servidor produtos, opções, limites e descontos: `orders.router.ts` ainda confia em preços de opções/descontos enviados pelo navegador. Revisar também a rota legada de criação de pedidos.
4. Reconciliar cadastro persistente do servidor com as opções de contingência do frontend, inclusive IDs e preços; aparência correta na prévia não confirma o cadastro de produção.
5. Revisar os textos de frete: a sacola ainda exibe taxa fixa e promessa de frete grátis antes da cotação por endereço. A página inicial exibe campanha FLASH15 e notificações de vendas que não foram validadas como dados reais.
6. Depois dos ajustes e implantação, testar cotação por endereço, recusa fora da área, valor final, pagamento/webhook e recebimento do pedido no painel. Fluxo de pagamento real não foi validado nesta rodada.

## Retomada

Após login no Render: conferir o serviço de produção e o estado atual do GitHub; não usar o checkout antigo `New project`. Preservar alterações concorrentes do Antigravity. Só declarar pronto após API, catálogo persistente e fluxo completo verificados.
