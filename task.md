# Task

Data: 2026-04-10

## Missao ativa

Recuperar o backend de producao no Render, que voltou a responder `502`, sem mexer no frontend ou no catalogo que continuam publicados.

## Atualizacao - 2026-04-23

- frontend publico respondeu `200`
- backend de producao respondeu `502` em `/health`
- nao ha Render CLI/API token disponivel no ambiente local para ler logs automaticamente
- smoke local do backend em SQLite temporario subiu com `/health = 200`
- hotfix atual: registrar handlers globais mais cedo e isolar falhas de automacoes opcionais no startup

## Contexto confirmado

- frontend publico publicado em `https://x-acai-delivery.vercel.app`
- backend de producao publicado em `https://x-acai-production-backend.onrender.com`
- banco de producao no Neon em uso pelo backend
- autenticacao admin com Firebase validada em producao
- catalogo importado do iFood publicado e reconciliado contra o Partner Portal
- complementos e adicionais corrigidos no backend e na UX publica
- repeticao do mesmo complemento com `+ / -` funcionando
- Pix real em producao validado com QR real, pedido pendente e pedido pago/completed
- WhatsApp de producao mantido em `WHATSAPP_PROVIDER=mock` por falta de Evolution publica

## Foco desta etapa

- sincronizar os documentos de continuidade com o estado real da producao
- registrar um smoke final objetivo de backend, frontend, pedido, Pix e admin
- alinhar o contrato de ambiente de producao com as URLs publicas atuais
- preparar o checklist de cutover de dominio sem abrir nova feature

## Resultado esperado

- docs do repo refletindo a producao atual, nao mais o estado antigo de staging
- contrato de variaveis de producao alinhado com:
  - `https://x-acai-delivery.vercel.app`
  - `https://x-acai-production-backend.onrender.com`
  - `/api/payments/mercadopago/webhook/mercadopago`
- checklist claro para trocar `vercel.app` e `onrender.com` pelo dominio final

## Proximo passo minimo

1. Apontar dominio do frontend e subdominio do backend.
2. Atualizar `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`, `MP_WEBHOOK_URL` e `Site` do Mercado Pago.
3. Rodar um smoke curto apos o cutover final.
