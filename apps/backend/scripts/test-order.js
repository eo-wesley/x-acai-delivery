const fs = require('fs');

async function runTests() {
    console.log("=== 1. TESTANDO HEALTH CHECK (/health) ===");
    try {
        const res = await fetch("http://localhost:3000/health");
        console.log(await res.json());
    } catch (e) {
        console.log("Falha /health", e.message);
    }

    console.log("\n=== 2. CRIANDO PEDIDO POST DE TESTE (/api/orders) ===");
    let orderId = null;
    try {
        const payload = JSON.parse(fs.readFileSync('./test_order.json', 'utf8'));
        const res = await fetch("http://localhost:3000/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log(data);
        orderId = data.id || data.orderId;
    } catch (e) {
        console.log("Falha /api/orders", e.message);
    }

    console.log("\n=== 3. CONSULTANDO PEDIDO CRIADO (GET /api/orders/:id) ===");
    if (orderId) {
        try {
            const res = await fetch(`http://localhost:3000/api/orders/${orderId}`);
            console.log(await res.json());
        } catch (e) {
            console.log("Falha GET /api/orders", e.message);
        }
    } else {
        console.log("=== ERRO: Order ID não extraído ===");
    }

    console.log("\n=== TESTE CONCLUÍDO ===");
}

runTests();
