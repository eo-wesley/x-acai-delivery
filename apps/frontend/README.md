# X-Açaí Frontend (PWA)

O aplicativo Mobile First para usuários finais pedirem açaí (App Customer), isolado em ambiente Next.js, desenhado via TailwindCSS. Ele interage dinamicamente com o `apps/backend` (porta 3000) por meio da Fetch API (REST).

## 🚀 Como Rodar o App (Desenvolvimento)

Abra dois terminais. No primeiro, rode o seu **Backend** de IA / Database:
```bash
cd apps/backend
npm run dev
```

No **segundo terminal**, levante o **Frontend Next.js**:
```bash
cd apps/frontend
npm run dev
```

O App ficará acessível no seu navegador via celular ou desktop em `http://localhost:3001` (ou a porta padrão alocada pelo Next.js como 3000 caso a do Backend seja alterada).

## 🏗️ Estrutura de Diretórios Criada

- `public/manifest.json`: Web App Manifest que transforma o site em "Aplicativo Instalável" na Home Screen do celular.
- `src/app/layout.tsx` e `globals.css`: Root UI do aplicativo PWA contendo o `<Header/>` e `<BottomNav/>` fixo na tela para Mobile. Modifica o fundo nativo para cinza iFood e esconde destaques de tap.
- `src/components/CartContext.tsx`: Gerenciador de "Carrinho" (Local Storage) global usando ContextAPI.
- `src/app/page.tsx`: Tela Principal (Home) puxando `/api/menu` do Backend.
- `src/app/search/page.tsx`: Rota de rastreamento pesquisando itens com Debounce estático no `/api/menu/search`.
- `src/app/product/[id]/page.tsx`: Página de detalhes ricos (Foto/Preço) que embute a injeção do pedido dentro do Contexto de carrinho.
- `src/app/cart/page.tsx`: Tela "Sacola" realizando o Breakdown Financeiro.
- `src/app/checkout/page.tsx`: Finaliza o payload complexo (cliente, items, tax) e empurra pro banco de dados em `POST /api/orders`.
- `src/app/order/[id]/page.tsx`: Interface de Tracking. Faz Long Polling interrogando a rota nativa sobre o status (Pending, Preparing, Delivered).
