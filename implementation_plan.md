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
