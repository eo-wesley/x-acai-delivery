# X-Açaí Backend

Professional backend for X-Açaí Delivery with LLM integration and WhatsApp webhooks.

## Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: Firestore (Firebase)
- **LLM**: Pluggable (Mock / Gemini)

## Project Structure

```
src/
├── server.ts              # Express app entry point
├── routes/
│   ├── health.ts         # Health check endpoint
│   ├── orders.ts         # Order management endpoints
│   └── webhook.ts        # WhatsApp webhook handler
├── llm/
│   ├── llm.types.ts      # LLM interfaces
│   ├── llm.router.ts     # LLM provider factory
│   └── providers/
│       ├── mock.provider.ts      # Mock LLM (fallback)
│       └── gemini.provider.ts    # Google Gemini integration
├── store/
│   └── firestore.client.ts  # Firestore operations
└── channels/
    └── whatsapp/
        ├── whatsapp.webhook.ts   # Webhook receiver
        └── whatsapp.sender.ts    # Message sender (future)
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required variables:

```env
# Firebase Service Account
FIREBASE_PROJECT_ID=xacai-delivery-prod
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# LLM Configuration
LLM_PROVIDER=mock          # or 'gemini'
GEMINI_API_KEY=...        # if using Gemini
GEMINI_MODEL=gemini-1.5-flash

# WhatsApp (optional)
WHATSAPP_TOKEN=...
WHATSAPP_VERIFY_TOKEN=your-secret-token
WHATSAPP_PHONE_NUMBER_ID=...
```

### 3. Get Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project: `xacai-delivery-prod`
3. Settings → Service Accounts
4. Generate new private key
5. Copy JSON values to `.env`

### 4. Run Locally

```bash
npm run dev
```

Server starts on `http://localhost:3000`

Test health:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-02-26T...",
  "version": "1.0.0"
}
```

## API Endpoints

### Health Check

```http
GET /health
```

### Create Order

```http
POST /api/orders
Content-Type: application/json

{
  "customerId": "customer123",
  "items": [
    {
      "productId": "prod1",
      "name": "Açaí Premium",
      "unitPrice": 15.00,
      "quantity": 2
    }
  ],
  "total": 30.00,
  "paymentMethod": "Pix",
  "address": "Rua X, 123",
  "notes": "Sem calda"
}
```

Response:

```json
{
  "success": true,
  "orderId": "order123...",
  "message": "Order created successfully"
}
```

### WhatsApp Webhook

**Verification** (GET):

```http
GET /webhook?hub.mode=subscribe&hub.challenge=challenge_token&hub.verify_token=your-secret
```

**Message Handler** (POST):

Configured to auto-reply with LLM.

## LLM Providers

### Mock Provider (Default)

Used when:
- `GEMINI_API_KEY` is not set
- `LLM_PROVIDER=mock`

Returns pre-defined responses.

### Gemini Provider

Used when:
- `LLM_PROVIDER=gemini`
- `GEMINI_API_KEY` is set

Calls Google Generative AI API.

To switch providers, update `.env`:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=sk_...
```

## Deployment to Cloud Run

### 1. Build Docker Image

```bash
docker build -t xacai-backend .
```

### 2. Push to Artifact Registry

```bash
gcloud auth configure-docker
docker tag xacai-backend gcr.io/xacai-delivery-prod/backend
docker push gcr.io/xacai-delivery-prod/backend
```

### 3. Deploy to Cloud Run

```bash
gcloud run deploy xacai-backend \
  --image=gcr.io/xacai-delivery-prod/backend \
  --region=us-central1 \
  --set-env-vars FIREBASE_PROJECT_ID=xacai-delivery-prod,LLM_PROVIDER=gemini,... \
  --allow-unauthenticated
```

### 4. Set Secrets in Cloud Run

Use Secret Manager for sensitive values:

```bash
gcloud secrets create firebase-key --data-file=key.json
```

Then reference in Cloud Run deploy:

```bash
--set-env-vars FIREBASE_PRIVATE_KEY="$(gcloud secrets versions access latest --secret=firebase-key)"
```

## Firestore Collections

### messages

```
{
  "phone": "+55 11 98747...",
  "message": "Olá, queria fazer um pedido",
  "type": "text|image|document",
  "direction": "incoming|outgoing",
  "provider": "gemini|mock",
  "timestamp": Timestamp,
  "processed": boolean
}
```

### orders

```
{
  "customerId": "cust123",
  "status": "placed|accepted|preparing|out_for_delivery|delivered",
  "items": [...],
  "total": 50.00,
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

### customers

```
{
  "phone": "+55 11 98747...",
  "name": "João Silva",
  "address": "Rua X, 123",
  "createdAt": Timestamp,
  "lastOrderAt": Timestamp
}
```

## Next Steps

- [ ] Implement WhatsApp message sender
- [ ] Add Cloud Tasks for async processing
- [ ] Implement order status webhooks to Flutter app
- [ ] Add image/document parsing for WhatsApp
- [ ] Implement rate limiting
- [ ] Add monitoring / error tracking

## Support

For issues or questions, refer to [ARCHITECTURE.md](../docs/ARCHITECTURE.md)
