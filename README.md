# X-Açaí Delivery SaaS 🍇

## Project Description

O X-Açaí Delivery é uma plataforma SaaS de delivery inspirada nos maiores do mercado (Cardápio Web, MenuDino, Delivery Direto, Saipos e iFood white-label). Ele permite que restaurantes operem seus próprios aplicativos de delivery e sistemas de gestão em uma arquitetura isolada via multi-tenant.

## Setup Instructions

- Node.js e npm instalados
- Docker para os containers base (se necessário no futuro)

1. Clone o repositório
2. Rode `npm install` nas pastas `apps/frontend` e `apps/backend`

## Running backend

```bash
cd apps/backend
npm run dev
```
O Backend roda na porta `http://localhost:3000`

## Running frontend

```bash
cd apps/frontend
npm run dev
```
O Frontend roda na porta `http://localhost:3001`

## GitHub Workflow

1. Implement feature
2. Run tests
3. Commit changes (verifique sempre o status do git)
4. Push to GitHub (`git push origin main`)

## AI Agent Rules Reference

Por favor, para qualquer IA que for atuar neste repositório, LEIA ANTES de começar:
- [AGENT_RULES.md](./AGENT_RULES.md)
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
