# Retomada do cardápio e revisão de balcão — 26/09/2026

## Atualização vigente — 27/09/2026

Esta seção substitui o estado pendente descrito no histórico abaixo. Depois da revisão, o proprietário autorizou aplicar os preços seguindo o padrão, incluindo o Marmitex, e continuar o fiscal na Takeat. O computador deve permanecer ligado para a prévia; não houve publicação em produção nem emissão fiscal nesta etapa.

### Preços implementados e conferidos

- Versão comercial `balcao-2026-09-26-v1`, 28 IDs e 58 variações. JSONs idênticos nos builds isolados de frontend e backend; não contêm custos privados nem credenciais.
- Açaís seguem custo direto de referência × 2, inclusive Monte 700 ml. Não foram acrescentados tráfego, comissão ou motoboy. Isso não representa lucro líquido nem custo de todas as combinações livres.
- Marmitex usa os ingredientes e quantidades do copo equivalente, trocando apenas copo/tampa pela embalagem própria: 500 ml R$ 24,56; 700 ml R$ 37,41. Monte 700 ml R$ 38,21.
- Paçoleite segue massa e condensado do Splash; paçoca e leite em pó recebem, cada um, metade da quantidade de condensado. A proporção 5:5:10 foi preservada, sem inventar quantidade de camadas.
- Duplas somam os dois sabores selecionados. Conjuntos com água somam os produtos reais, sem desconto inventado. Catálogo informa “A partir de” onde o valor varia.
- Bebidas, adicionais, cupuaçu e itens separados mantêm os preços cadastrados. Seus custos não foram declarados fechados.
- Home, detalhe, busca, recomendações, sacola e cálculo dos itens no servidor usam a mesma tabela. Sacolas antigas preservam itens, quantidades, escolhas e observações e recalculam os preços; cupom só é limpo se o valor mudar.
- Servidor valida grupos/opções/limites e descarta preços de adicionais enviados pelo cliente, usando os valores cadastrados. Não foram alterados banco real, planilhas originais ou preços da Takeat.

### Evidências atuais

- 53 testes Node de preços/apresentação/opções/conjuntos/backend/entrega/persistência/disponibilidade aprovados em 27/09, mais 13 verificações internas do arquivo de apresentação. Frontend TypeScript sem erros; `git diff --check` sem erros.
- Navegador a 390 px: Marmitex 700 ml com massa açaí, dentro da marmitex, banana/granola/leite em pó/paçoca, água sem gás e colher Não chegou à sacola por R$ 43,41 (37,41 + 6,00). Sem estouro horizontal do documento. Item de teste removido; nenhum checkout, pedido ou pagamento enviado.
- Relatório completo privado: `outputs/revisao_balcao_2026-09-26/Precos_Aplicados_Balcao.html`, relativo a Prosperando, com cálculos e ressalvas. O relatório anterior `Precos_Balcao_X-Acai.html` é histórico da revisão pré-aplicação.
- Prévia conferida HTTP 200 em `http://localhost:3005/` e `http://192.168.15.4:3005/`. Celular exige mesma rede e PC ligado. Não confundir com atualização da Vercel.

### Limites de publicação e fiscal

- Ainda não considerar loja pronta para vendas: permanecem os bloqueios de produção/compilação registrados abaixo e a validação pendente do desconto/cupom e da taxa da rota legada.
- Corrigido comportamento de contingência: home identifica “Prévia — pedidos indisponíveis” quando não consegue consultar a loja. Catálogo e montagem da sacola continuam disponíveis. Checkout exige confirmação de loja aberta e revalida antes do POST; falha/fechamento não inicia pedido ou pagamento. Aviso conferido na interface; bloqueio coberto por testes isolados sem pedido real.
- Takeat voltou a carregar Cardápio Fiscal e Notas Emitidas na sessão autenticada do Chrome. Em 27/09, filtro do dia sem notas autorizadas, canceladas ou processando; não significa ausência de emissão em todos os períodos.
- Histórico do suporte recuperado. A equipe informou em 24/09 que configura e ativa internamente o emissor, que emissão totalmente automática não estava disponível e que havia finalização/emissão em lote até 100 NFC-e. Exigências informadas: IE regular, A1, CSC/ID, série/numeração e dados fiscais validados pela contabilidade. Protocolo e detalhes operacionais estão no checkpoint privado fora do repositório.
- Código recebido do proprietário não está em arquivo, Git ou relatório. Atendimento retomado para confirmar finalidade e canal seguro. Não preencher código em campo presumido; não alterar NCM/CFOP/CSOSN nem emitir teste em produção.
- Suporte respondeu em 27/09: plantão de fim de semana não realiza a ativação; retornar de segunda a sexta, 8h–18h. Solicitado registrar/encaminhar a pendência para o próximo horário comercial. Fiscal não está ativado ou validado por esta implementação.

## Histórico anterior (não representa o estado atual dos preços)

## Pedido mais recente

O proprietário acrescentou a revisão de preços de balcão e pediu ver todos os preços e as fichas antes de receber/aplicar a versão final. Por isso, não publicar, não alterar preços comerciais e não desligar o computador nesta etapa. O pedido anterior de desligamento era condicionado à conclusão, agora pendente da revisão.

Na retomada seguinte, pediu concluir primeiro os preços do aplicativo e depois continuar a implantação fiscal na Takeat. Forneceu um código da contabilidade, cujo valor não deve ser registrado neste repositório. Ainda falta identificar a finalidade/campo correto no atendimento fiscal; não houve configuração nem emissão de nota nesta retomada. A conclusão de preços continua dependendo das informações de receita e das decisões listadas abaixo, não de créditos ou de falha nos testes locais.

## Implementação local salva, não publicada

- Ordem: copos da promoção, combos, Monte o Seu, bebidas. Destaques editoriais identificados como destaques, não ranking de vendas.
- Nomes das duplas esclarecem dois copos e volume. Descrições curtas dos nove sabores com fonte própria e do Paçoleite preservam a composição do catálogo; isso não confirma ficha de custo do Paçoleite.
- Conjuntos com água usam dois itens reais na sacola, somando preços existentes sem desconto. O preço comercial de balcão desses conjuntos ainda depende da revisão.
- Frete da sacola não exibe mais valor fixo ou promessa de gratuidade. Removidos banner promocional e notificações de vendas não verificadas da vitrine.
- Escolhas de massa, colher, tamanho e adicionais preservadas. Observações diferentes geram linhas distintas na sacola.
- Correção no carregamento: detalhe atual não é substituído por preço de contingência se a lista falhar; sem catálogo da bebida, o conjunto fica bloqueado.
- Removido botão duplicado de sacola da página inicial. Ajuste de layout da sacola/cupom para telas estreitas ainda merece uma nova conferência visual, pois a prioridade mudou para preços.

## Verificações

- Última execução: 32 testes Node aprovados, incluindo um arquivo com 14 verificações internas de apresentação (45 verificações no total).
- Conferência visual local: dupla 300 ml com duas águas, dois sabores e colher Não chegou à sacola por R$ 58,90; água aparece como 2 × R$ 6,00. Itens de teste foram removidos. Não foi enviado pedido nem pagamento.
- TypeScript (`tsc --noEmit --incremental false`) e os 32 testes Node foram executados novamente e passaram na retomada de 26/09.
- Prévia aberta no navegador: ordem das quatro categorias confirmada; no Monte 500 ml aparecem açaí/cupuaçu, local dos complementos, três complementos obrigatórios, adicionais, bebida e colher Sim/Não. Não houve pedido de teste. Home sem estouro horizontal a 390 px e produto sem estouro horizontal a 320 px; isso não substitui teste em aparelho físico nem a conferência restante da sacola.
- Build de produção local compilou, mas não concluiu prerender por Firebase `auth/invalid-api-key` sem configuração local. Não declarar build aprovado.
- Lint ampliado tem problemas preexistentes de tipos e efeitos nos componentes de sacola; não declarar lint global limpo.
- Vercel raiz respondeu 200; backend Render respondeu 503 / Service Suspended. Nenhuma alteração de hospedagem, credencial ou cobrança.

## Revisão de preços

Relatório privado fora do repositório público: `outputs/revisao_balcao_2026-09-26/Precos_Balcao_X-Acai.html`, relativo à pasta Prosperando. Contém 58 variações, valores atuais do aplicativo, 44 cálculos referenciais de fichas e 14 pendências. Não é tabela de balcão aprovada.

- 36 variações de nove copos têm fichas originais, com percentuais de 100% sobre custo.
- Oito formatos Monte têm cálculo da composição registrada; o custo de livre escolha não está fechado. Monte 700 ml usa 30% sobre custo na origem.
- Paçoleite, dois Marmitex, quatro duplas e quatro bebidas não têm preço de balcão suficientemente estabelecido. O proprietário confirmou Paçoleite com 5 g de paçoca + 5 g de leite em pó + 10 g de leite condensado por camada (20 g de recheio, sem contar a massa). Faltam quantidade de camadas, massa de açaí e eventual finalização em cada tamanho. A revisão não usa mais a receita emprestada como cálculo de Paçoleite. Duplas possuem custo cadastrado de Monte, não dos sabores permitidos.
- Fontes: dez XLSX originais; 607 componentes do banco aberto somente em leitura, iguais ao snapshot; base25/08; CSV corrigido com custos posteriores de Ovomaltine, amendoim e leitinho. Não alterados banco, XLSX ou preços do catálogo.

## Acesso local

Servidor de prévia na porta3005. Atalho do Desktop `Abrir X-Acai.cmd` chama `scripts/abrir-previa.ps1`; consulta endereço IPv4 da interface física. Último IP conferido em 26/09:192.168.15.4 (Ethernet). Os endereços localhost e192.168.15.4:3005 responderam HTTP200 com conteúdo X-Açaí. O endereço pode mudar; não reutilizar .3 ou .5 sem conferência. O acesso pelo celular exige mesma rede e computador ligado; acesso real por outro aparelho ainda não comprovado. Sem publicação nova, alteração de firewall ou alteração de preços nesta retomada.
