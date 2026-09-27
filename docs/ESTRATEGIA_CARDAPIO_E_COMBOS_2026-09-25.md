# X-Açaí — proposta de estrutura do cardápio e combos

Pesquisa realizada em 25/09/2026. Status: recomendação para revisão; não altera o aplicativo, preços, receitas ou ofertas publicadas.

## 1. Decisão recomendada

Açaí abre o cardápio. Bebidas fecham as categorias, mas continuam acessíveis como complemento dentro do pedido. Manter as quatro categorias existentes, com esta ordem inicial:

| Ordem | Categoria existente | Função proposta |
|---|---|---|
| 1 | Açaí Copos da Promoção | Receitas prontas, foto real e escolha de tamanho: caminho de entrada para quem quer decidir rápido. |
| 2 | Açaí Combos | Opções individuais com bebida e conjuntos de dois copos, com composição explícita. |
| 3 | Açaí Monte O Seu | Personalização completa, mantendo todos os formatos e complementos. |
| 4 | Vai uma Bebida? | Água e refrigerante avulsos, como acompanhamento do produto principal. |

Essa é uma hipótese inicial adequada ao catálogo atual, não uma ordem universal comprovadamente superior. Se os pedidos reais mostrarem predominância do Monte O Seu, testar essa categoria em primeiro. Não copiar os preços de outras cidades ou franquias.

## 2. O erro encontrado no aplicativo

Inspeção do código local, não do cadastro ativo de produção:

- `apps/frontend/src/app/page.tsx`: `PUBLIC_CATEGORY_TABS` fixa bebidas em primeiro; o estado inicial seleciona essa primeira categoria.
- O bloco chamado “Mais Pedidos” usa etiquetas `popular`/`promo` ou os primeiros quatro produtos disponíveis. Não consulta um ranking de vendas.
- No catálogo de contingência atual, isso coloca as quatro bebidas nos destaques.

Na próxima implementação: mudar a ordem e a aba inicial; substituir “Mais Pedidos” por “Destaques da X-Açaí” enquanto a seleção for editorial. Se houver ranking verdadeiro, calcular com pedidos concluídos de um período identificado, excluindo cancelamentos e testes.

## 3. O que as referências realmente mostram

| Referência | Observação pública | Aplicação e limite |
|---|---|---|
| [Maria Açaí — cardápio oficial](https://mariaacai.com.br/cardapio/) | As linhas de açaí aparecem antes de Bebidas; a página também anuncia combos no delivery. | Reforça a prioridade do produto principal. Não demonstra aumento de conversão nem ranking de vendas. |
| [Açaí da Barra — unidade Criciúma](https://acaidabarracriciuma.ola.click/products) | Publica conjuntos de dois copos, casal de 2 × 500 ml e família de 4 × 500 ml. Bebidas ficam depois de combos/copos/monte o seu. | Inspira organização por ocasião de consumo. É uma unidade, não uma regra de toda a rede. |
| [The Best Açaí — unidade Registro](https://aiqfome.com/SP/registro/the-best-acai) | Oferece individuais de 300/500 ml, duplas desses tamanhos e conjunto de 4 × 300 ml. | Sustenta a escada individual, dupla e grupo. Um rótulo de “mais vendidos” da loja não fornece os números de vendas. |
| [McDonald’s — regulamento Méqui Friday 2025](https://cupons.mcdonalds.com.br/mequifriday2025) | Documenta ofertas compostas por sanduíche, batata e bebida, com quantidades e tamanhos definidos. | Copiar a clareza do conjunto e das trocas, não preços nem uma promoção vencida. Referência histórica, não oferta vigente. |
| [iFood — cadastro de produtos](https://blog-parceiros.ifood.com.br/cadastro-de-produtos/) | Recomenda nomes claros, descrições objetivas, fotos fiéis, variações explícitas e combos destacados. | Aplicar essas regras à apresentação da X-Açaí. Conteúdo consultado pelo resultado indexado; abertura direta retornou 403. |
| [Sebrae-SP — engenharia de cardápio](https://sp.agenciasebrae.com.br/cultura-empreendedora/sebrae-sp-e-sinhores-promovem-capacitacoes-para-fortalecer-negocios-de-alimentacao-com-foco-na-copa-do-mundo/) | Orienta avaliar popularidade e resultado econômico dos produtos. | Não escolher destaque apenas por preço ou aparência: confirmar depois com dados da própria loja. |

Não foi localizado um ranking auditável das açaiterias que mais vendem, nem prova de que açaí + água seja o combo campeão dessas redes. Aqui, açaí + água é uma hipótese comercial própria para testar.

## 4. Primeira tela e ordem dos copos

Proposta de três destaques editoriais, sem duplicar SKU: um copo pronto de entrada (X-Tradicional 300 ml), um Monte O Seu 500 ml e um combo de 2 × 300 ml. O título deve dizer “Destaques”, não “Os mais vendidos”. Os três são sugestões de variedade de uso, não campeões comprovados.

Copos prontos: manter um cartão por receita, com 300, 400, 500 e 700 ml dentro do produto. Não criar quarenta cartões para dez receitas. Mostrar no cartão o tamanho correspondente ao preço de entrada; após escolher tamanho, mostrar o total atualizado.

Ordem editorial inicial sugerida: X-Tradicional, X-King Paçoca, X-Splash, X-Paçoleite, X-Paçokita, X-Chocolã, X-Tropical, X-Creme, X-Tella e X-King Tella. Começa pelo nome mais direto, mantém as opções de entrada juntas e avança para receitas de maior preço no cadastro. Não altera ingredientes nem classifica popularidade.

Monte O Seu: primeiro copos de 300, 400, 500 e 700 ml; depois marmitex de 500/700 ml; depois barcas P/M, Litrão e Roleta, agrupados por formato. Não inventar para quantas pessoas cada embalagem serve.

Preservar as regras existentes: copos 300/400/500 ml com três complementos; 700 ml com quatro; Barca P, Litrão e Roleta com seis; Barca M com sete. Açaí/Cupuaçu, itens dentro/separados e colher continuam visíveis, com os acréscimos atuais explícitos.

## 5. Combos: começar simples, com o que já existe

### A. Açaí + Água — piloto recomendado

Proposta: Monte O Seu de 500 ml com três complementos + uma água sem gás de 500 ml. O título informa os dois volumes. Usar o produto existente e a bebida existente como componentes, sem copiar fichas ou estoque.

Água deve estar claramente incluída no preço do pacote, não aparecer cobrada novamente como adicional. Se o cliente estiver comprando apenas o copo avulso, a oferta de água continua opcional e sem seleção escondida. Cupuaçu, itens separados e troca por outra bebida devem informar qualquer diferença antes da confirmação.

### B. Dupla X-Açaí — melhorar os combos existentes

O catálogo local já contém dois copos de 300, 400, 500 ou 700 ml. A descrição inclui escolha entre X-Tradicional, X-Paçoleite, X-Splash e X-King Paçoca. Sugestão de nome: “Dupla X-Açaí — 2 copos de 300 ml”, repetindo o padrão nos outros tamanhos.

Hoje a bebida é adicional pago, não parte do preço desses combos. Não anunciar “com bebida” sem mudar a composição e validar o total.

### C. Dupla + 2 águas — segunda experiência

Proposta: o combo existente de 2 × 300 ml + duas águas sem gás de 500 ml. Exige revisão do seletor: o fallback atual dos combos permite apenas uma bebida. A comanda precisa discriminar os dois copos e as duas garrafas. Não basta trocar o título.

Conjunto de quatro copos pode ficar para uma segunda fase, se os pedidos e a operação justificarem. Não lançar várias ofertas muito parecidas ao mesmo tempo.

## 6. Referências de preço — não são preços novos aprovados

Valores lidos do catálogo local de contingência e das opções, não confirmação da tabela comercial ativa. Somas sem frete, Cupuaçu, itens separados ou extras:

| Composição sugerida | Soma dos valores locais, sem novo desconto |
|---|---:|
| Monte 300 ml + água sem gás 500 ml | R$ 30,90 + R$ 6,00 = R$ 36,90 |
| Monte 500 ml + água sem gás 500 ml | R$ 37,90 + R$ 6,00 = R$ 43,90 |
| Combo existente 2 × 300 ml + 2 águas sem gás 500 ml | R$ 46,90 + R$ 12,00 = R$ 58,90 |

Essas somas não demonstram lucro nem economia. Sem desconto efetivo, comunicar praticidade, não “economize”. Antes de definir promoção, conferir ficha e embalagem dos itens, custo da bebida, taxas reais do canal e eventual entrega subsidiada. Nenhum valor de tráfego por pedido foi criado ou adicionado.

O mesmo conjunto, com a mesma receita e quantidade, deve ser usado na comparação entre avulsos e combo. Não comparar o preço do Monte O Seu com o de um copo pronto de receita diferente para anunciar desconto.

## 7. Como deve ser a escolha no celular

- Copo pronto: tamanho → adicionais opcionais → bebida opcional → colher → resumo.
- Monte O Seu: formato/tamanho → massa → dentro/separados → complementos incluídos → adicionais → bebida → colher → resumo. Manter explícita a quantidade obrigatória.
- Dupla: identificar Copo 1 e Copo 2, permitir o mesmo sabor duas vezes quando previsto, listar bebidas e informar colher. Conferir a saída na comanda, não apenas a tela do cliente.
- Descrição curta: composição, tamanho, inclusões e restrições. Preservar fotos reais; uma foto com água só representa um pacote com água incluída ou precisa distinguir a sugestão.
- “Promoção”, percentual, preço riscado e urgência só quando correspondem a uma oferta real aprovada. Não usar notificações inventadas de compras recentes.

## 8. Teste e critérios de decisão

Após a loja estar operacional, começar pela ordem das categorias e pelos destaques, mantendo preços constantes. Observar pelo menos duas semanas completas comparáveis como janela inicial, prolongando se houver poucos pedidos; isso não garante significância estatística.

Medir visitantes do cardápio que concluem pedidos, inclusão de bebida, participação dos combos, valor do pedido, resultado após custos reais, tempo de preparo e reclamações. Depois testar somente uma proposta de açaí + água, mantendo o restante estável.

Manter a mudança se melhorar a compra e o resultado sem piorar preparo/erros. Ajustar se aumentar o valor do pedido mas reduzir o resultado ou dificultar escolhas. Pausar oferta se a composição/preço não bater com a comanda ou se o custo ainda estiver desconhecido. Não declarar vencedor só porque o faturamento bruto subiu.

## 9. Próxima implementação, quando solicitada

1. Reordenar as quatro categorias e abrir a primeira categoria de açaí disponível.
2. Tornar os destaques explícitos; eliminar o falso ranking baseado na posição do cadastro.
3. Aplicar nomes claros aos combos de dois copos, sem mudar sua receita/preço por engano.
4. Aprovar composição e preço de qualquer novo pacote com água; implementar seus componentes e regras.
5. Conferir celular, tamanhos, limites, totais, ausência de bebida cobrada duas vezes e comanda.

Nenhuma dessas alterações foi publicada nesta rodada de pesquisa.
