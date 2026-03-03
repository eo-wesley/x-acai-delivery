# RENDER DEPLOYMENT GUIDE

Este guia contém os valores exatos e padronizados que você deve usar no painel do Render para concluir a implantação automatizada via GitHub. O projeto foi preparado para usar o motor auto-detectável do Render e as configurações em `.yaml`. Se você for fazer pelo Dashboard Web antigo manualmente, copie estes dados.

### 1) Configurações de Build e Setup

Abra as **Settings** do seu Web Service no Render ou crie um novo conectado ao seu repositório:

- **Environment/Runtime**: Node (ou Docker se a UI for a que permite forçar web context, mas o `package.json` já tem tudo para rodar normal no Node nativo também).
- **Root Directory**: `apps/backend` (Isso corrige o erro de "package.json not found").
- **Build Command**: `yarn install && yarn build` (ou `npm ci && npm run build`).
- **Start Command**: `node dist/server.js` (ou `yarn start`).

### 2) Configuração do Firebase (A Nova Variável)

O backend foi recodificado para receber a sua conta de serviço do Firebase (Service Account) inteira em uma única variável de ambiente, muito mais seguro e com menos chance de você errar ao colar chaves com `\n`.

**Para obter a variável:**
1. Vá no [Firebase Console](https://console.firebase.google.com).
2. Selecione o seu projeto ativo de produção.
3. Clique na Engrenagem ⚙️ (Project settings) > **Service accounts**.
4. Clique em **Generate new private key** (Isso baixará um arquivo `.json`).
5. Abra o arquivo `.json` no Bloco de Notas (ou seu editor de código) e **copie todo o conteúdo dele**.

**No painel do Render (guia Environment):**
- **Crie uma variável chamada:** `FIREBASE_SERVICE_ACCOUNT_JSON`
- **Cole o valor:** (O conteúdo integral do `.json` copiado no passo 5).

### 3) Lista Completa de Environment Variables:

| KEY | VALUE |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` *(o Render sobrescreve isso dinamicamente, mas defina 3000)* |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | `{"type": "service_account", "project_id": ...}` |

*(Obs: Apague as variáveis antigas de projeto/credencial granulares se você já tiver tentado colocá-las no Render. Use APENAS a `FIREBASE_SERVICE_ACCOUNT_JSON` e a arquitetura nova vai absorver corretamente).*

### 4) Finalizando

Depois de salvar as variáveis de ambiente:
1. Clique em **"Manual Deploy"**.
2. Escolha **"Clear build cache & deploy"** (Garante que o root directory seja lido do zero).
3. Após o build concluído com sucesso, acesse a URL do seu serviço + `/health` para confirmar.
   Ex: `https://seu-web-service.onrender.com/health` retornará 200 OK.
