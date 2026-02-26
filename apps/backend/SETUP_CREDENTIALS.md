# Backend Setup - Como Configurar as Credenciais do Firebase

## Problema Atual
O backend foi criado e compila com sucesso, mas precisa das credenciais do Firebase Service Account para funcionar. Você verá este erro ao tentar iniciar:

```
FirebaseAppError: Service account object must contain a string "project_id" property.
```

## Solução: Obter Credenciais do Firebase

### Passo 1: Acessar o Firebase Console
1. Abra https://console.firebase.google.com
2. Selecione o projeto: **xacai-delivery-prod**
3. Clique em ⚙️ **Settings** (engrenagem) > **Settings**

### Passo 2: Gerar Nova Chave de Conta de Serviço
1. Clique na aba **Service Accounts**
2. Selecione a linguagem **Node.js**
3. Clique em **Generate New Private Key**
4. Será baixado um arquivo JSON: `xacai-delivery-prod-XXXXXX.json`

### Passo 3: Copiar Valores para .env

Abra o arquivo JSON baixado e copie estes valores para `backend/.env`:

```env
FIREBASE_PROJECT_ID=<copie o valor de "project_id">
FIREBASE_PRIVATE_KEY_ID=<copie o valor de "private_key_id">
FIREBASE_PRIVATE_KEY=<copie todo o valor de "private_key" -- mantenha as quebras de linha!>
FIREBASE_CLIENT_EMAIL=<copie o valor de "client_email">
FIREBASE_CLIENT_ID=<copie o valor de "client_id">
```

### Exemplo (NÃO USE ESTE - APENAS PARA REFERÊNCIA):
```env
FIREBASE_PROJECT_ID=xacai-delivery-prod
FIREBASE_PRIVATE_KEY_ID=abc123def456xyz
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc@xacai-delivery-prod.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
```

### ⚠️ IMPORTANTE - Segurança
- **Nunca** commit o arquivo `.env` em Git (já está no .gitignore)
- **Nunca** compartilhe essa chave privada
- **Nunca** coloque em logs ou screenshots
- Esta chave permite acesso total ao Firestore da sua aplicação

## Como Testar Após Configurar

### 1. Iniciar o backend (no PowerShell):
```powershell
cd c:\projetos\x-acai-delivery\apps\backend
& 'C:\Program Files\nodejs\node.exe' dist/server.js
```

Você deve ver:
```
🚀 X-Açaí Backend running on http://localhost:3000
📡 Using LLM Provider: mock (fallback)
🔥 Firestore connected to project: xacai-delivery-prod
```

### 2. Testar endpoint de saúde:
```bash
curl http://localhost:3000/health
```

Resposta esperada:
```json
{"status":"ok","timestamp":"2024-01-XX...","version":"1.0.0"}
```

### 3. Testar criação de pedido (opcional):
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "test-123",
    "items": [{"productId": "p1", "name": "Açaí", "quantity": 1, "unitPrice": 25}],
    "total": 25,
    "paymentMethod": "pix"
  }'
```

## Próximos Passos

1. Após configurar `.env`, reinicie o backend
2. Na próxima vez que usar o checkout no app Flutter, o backend será chamado
3. O pedido será salvo no Firestore DUAS VEZES:
   - Uma vez pelo Flutter (direto no checkout_page.dart)
   - Uma vez pelo Backend (via ApiClient.createOrder)

Isso é redundante por enquanto, mas permite testar a integração. Depois você pode remover uma das duplicações.

## Troubleshooting

| Erro | Solução |
|------|---------|
| `FirebaseAppError: INVALID_CREDENTIAL` | Faltou `FIREBASE_PRIVATE_KEY` no .env |
| `Cannot connect to localhost:3000` | Verifique se o backend está rodando (comando acima) |
| `ENOENT: no such file or directory` | Você não está no diretório `/backend` |
| `Wasm dry run...` | Aviso do Flutter - pode ignorar |

