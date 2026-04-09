# Implementation Plan

Data: 2026-04-01

## Objetivo

Fechar a preparacao do projeto para producao, consolidando o que foi validado em staging e transformando isso em um plano final de rollout.

## Plano executado nesta continuidade

1. Registrar formalmente a decisao de manter `WHATSAPP_PROVIDER=mock` no staging.
2. Corrigir o frontend para deploy remoto separado do backend.
3. Atualizar variaveis publicas do frontend e a documentacao do webhook/ambiente.
4. Remover bloqueios reais de build do frontend encontrados no checkout limpo.
5. Consolidar um checklist final de producao com provedores, variaveis e smoke test.
6. Atualizar os documentos de continuidade e subir tudo para `main`.

## Atualizacao da fase de producao real

1. Revisar a camada de banco e a documentacao atual.
2. Validar a `DATABASE_URL` real de producao no Neon.
3. Aplicar `db:migrate` na base de producao.
4. Confirmar schema pronto sem executar seed minima.
5. Alinhar o `render.yaml` da raiz para o runtime Node com `preDeployCommand`.
6. Publicar o backend de producao no Render.
7. Validar `/health`, rotas admin protegidas, menu publico e criacao de pedido em producao.
8. Corrigir o bloqueio de configuracao do Mercado Pago em producao antes de avancar para o frontend.

## Escopo tecnico

- Frontend:
  - `apps/frontend/src/app/admin/finance/page.tsx`
  - `apps/frontend/src/app/admin/logistics/page.tsx`
  - `apps/frontend/src/app/admin/reports/page.tsx`
  - `apps/frontend/src/app/criar-delivery/page.tsx`
  - `apps/frontend/src/app/login/page.tsx`
  - `apps/frontend/src/app/onboarding/welcome/page.tsx`
  - `apps/frontend/src/app/order/[id]/page.tsx`
  - `apps/frontend/src/app/pix/[id]/page.tsx`
  - `apps/frontend/vercel.json`
- Ambientes e docs:
  - `.env.example`
  - `.env.production.example`
  - `docs/PRODUCTION_ENVIRONMENT.md`
  - `docs/PRODUCTION_CHECKLIST.md`
- Continuidade:
  - `PROJECT_STATUS.md`
  - `task.md`
  - `implementation_plan.md`
  - `walkthrough.md`

## Fora de escopo

- ativar Evolution real em staging sem endpoint publico confirmado
- publicar producao final sem as credenciais reais
- refatorar warnings legados de metadata do Next 16 que nao bloqueiam build

## Atualizacao - importacao iFood em producao

1. Fechar `sort_order` no backend e no admin/menu para garantir ordem exata do catalogo.
2. Criar um importador one-off com duas fases:
   - `open`: abrir Chrome/Edge com perfil dedicado, iFood e admin do X-Acai
   - `run`: capturar o catalogo do iFood pela sessao autenticada e importar via API admin
3. Usar captura de rede do navegador via CDP para evitar depender do HTML publico vazio do iFood.
4. Normalizar produtos, categorias, imagens e grupos de opcoes antes da escrita.
5. Gravar direto na producao apenas se o menu continuar vazio, evitando duplicacao acidental.

## Atualizacao desta entrega

6. Restaurar o caminho recomendado `open` + `run` no importador sobre a `main` atual.
7. Enriquecer o snapshot abrindo cada item do catalogo autenticado para capturar complementos e modificadores.
8. Preservar o fluxo por arquivo (`--phase extract|normalize|write|all`) como fallback operacional.
