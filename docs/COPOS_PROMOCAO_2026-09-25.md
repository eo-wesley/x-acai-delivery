# Copos da promoção — conferência em 25/09/2026

Referência: quadros preservados de `20260924-0316-47.5894971.mp4` e cadastro importado em `apps/backend/ifood-normalized-augmented.json`.

Os dez sabores têm os grupos nesta ordem: **Tamanho do Copo** (obrigatório, 1), **Turbinando o Açaí** (opcional), **Vai uma Bebida?** (opcional), **Colher** (obrigatório, Sim/Não). Os limites opcionais de 5 adicionais e 20 bebidas vêm do cadastro importado; o vídeo não expõe os limites.

| Sabor | Base (300ml) | +400ml | +500ml | +700ml | Quadro do vídeo |
|---|---:|---:|---:|---:|---|
| X-King Paçoca | R$26,90 | R$4 | R$8 | R$16 | 00:14 |
| X-Splash | R$26,90 | R$4 | R$8 | R$15 | 00:26 |
| X-Tradicional | R$26,90 | R$4 | R$8 | R$15 | 00:34 |
| X-Paçoleite | R$26,90 | R$4 | R$8 | R$15 | 00:42 |
| X-Paçokita | R$28,90 | R$4 | R$8 | R$15 | 00:48–00:50 |
| X-Chocolã | R$29,90 | R$4 | R$8 | R$15 | 00:54–00:56 |
| X-Tropical | R$30,90 | R$4 | R$8 | R$15 | 01:01 |
| X-Creme | R$31,90 | R$4 | R$8 | R$15 | 01:08 |
| X-Tella | R$32,90 | R$4 | R$8 | R$15 | 01:16 |
| X-King Tella | R$32,90 | R$4 | R$8 | R$15 | 01:23 |

Adicionais, confirmados em 00:18–00:20: creme de amendoim R$6, avelã R$7, Bueno R$6, leitinho R$6, morango R$6, Kit-Kat R$6 e Nutella R$10.

Bebidas, confirmadas em 00:30 e 01:20: água Crystal sem gás 500ml R$6, com gás 500ml R$7, Coca-Cola 350ml R$10 e Pepsi 350ml R$10. Colher Sim/Não sem acréscimo, em 00:32.

O preço da opção é apenas o acréscimo. Exemplo: King Paçoca 700ml + avelã + Coca = 26,90 + 16 + 7 + 10 = **R$59,90**.

A correção restaura esses grupos quando o detalhe da API/catálogo local não contém opções. Grupos já cadastrados na API são preservados. Não é uma importação fiscal nem alteração do cadastro iFood.

O X-Tropical estava ausente de `default-menu.json` e foi restaurado entre X-Chocolã e X-Creme. Foto e identificador vêm de `tmp/ifood-snapshot.json` (produto `291c81bc-e2e7-4457-ae2f-87f610819cab`); preço e composição vêm do cadastro importado. A descrição foi corrigida para retirar o trecho de X-Chocolã que estava colado na descrição do Tropical. A restauração é do catálogo local; o cadastro do produto no servidor de pedidos precisa ser conciliado antes de vender esse item em produção.

Validação: `node --test scripts/test-promotion-options.cjs` e `npx tsc --noEmit` em `apps/frontend`. Os seis testes cobrem os dez sabores, acréscimos, obrigatoriedade, troca de tamanho/colher, repetição/limites, renderização dos grupos e envio das escolhas para a sacola. Não geram pedidos ou pagamentos. `node scripts/check-promotion-preview.cjs http://192.168.15.3:3005` verifica os arquivos efetivamente entregues pela rede local.

A conexão de controle do navegador retornou `User unavailable` nesta sessão. A renderização foi validada em teste React, mas a aparência final em um navegador/celular precisa de nova inspeção visual quando essa conexão estiver disponível.
