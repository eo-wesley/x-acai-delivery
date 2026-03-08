#!/bin/bash
# test-order.sh - End2End Validation Script for backend services.
echo ""
echo "=== 1. TESTANDO HEALTH CHECK (/health) ==="
curl -s http://localhost:3000/health | jq || echo "Falha ao ler status!"

echo ""
echo "=== 2. CRIANDO PEDIDO POST DE TESTE (/api/orders) ==="
response=$(curl -s -X POST http://localhost:3000/api/orders \
-H "Content-Type: application/json" \
-d @test_order.json)

echo "$response" | jq || echo "Falha ao postar pedido: $response"

# Extract ID for the next request validation depending on SQLite/Firestore return schema
orderId=$(echo "$response" | jq -r '.id')
# If .id is null, it might be returned as .orderId
if [ "$orderId" == "null" ]; then
    orderId=$(echo "$response" | jq -r '.orderId')
fi

echo ""
if [ "$orderId" != "null" ] && [ -n "$orderId" ]; then
    echo "=== 3. CONSULTANDO PEDIDO CRIADO (GET /api/orders/$orderId) ==="
    curl -s http://localhost:3000/api/orders/$orderId | jq || echo "Falha ao buscar id!"
else
    echo "=== ERRO: Order ID não pode ser extraido do Response acima. ==="
fi

echo ""
echo "=== TESTE CONCLUÍDO ==="
