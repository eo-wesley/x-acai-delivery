# Monte o Seu — massa e colher

Correção pedida pelo usuário em 25/09/2026, conferida nos quadros preservados de `20260924-0320-53.3920248.mp4`.

- **Vai o quê?**: obrigatório, escolher uma massa. Açaí sem acréscimo, Cupuaçu +R$5,00. Quadro de 00:24 (400ml) e 01:18 (700ml); demais formatos repetem as duas opções.
- **Colher**: obrigatório, Sim/Não, sem cobrança. Quadro de 00:40.
- Sequência: massa, onde vai, complementos, adicionais, bebidas, colher. Exceção preservada do vídeo: na Barca M, colher vem antes de bebidas (02:40).
- Abrange os dez produtos do Monte o Seu, inclusive marmitex, barcas, Litrão e Roleta. Limites já usados de complementos permanecem intactos.

O resolvedor da tela agora completa apenas massa/colher ausentes também quando a API já entrega outros grupos. Preserva grupos existentes, IDs e preços; a escolha aparece em `selected_options` na sacola. Não pressupõe Açaí nem Sim: o cliente precisa responder.

Validação: nove testes em `scripts/test-promotion-options.cjs`, TypeScript e checagem HTTP da prévia em `scripts/check-promotion-preview.cjs`. Exemplo testado: Monte 300ml R$30,90 + Cupuaçu R$5,00 = R$35,90; ao trocar de volta para Açaí retorna a R$30,90, com itens distintos na sacola.

O controle de navegador ainda retorna `User unavailable`. Testes renderizam os componentes React e conferem a transmissão das escolhas para a sacola; não simulam pagamento nem substituem a inspeção visual no celular.
