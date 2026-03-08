// Test Script for POST /ai/tools
async function testTools() {
    console.log('🔄 Testando Motor de Ferramentas / PadBase (/ai/tools)...\n');
    try {
        const payload = {
            messages: [
                { role: 'user', content: 'Quero ver o cardápio por favor' },
                { role: 'assistant', content: 'Temos açai e barcas. O que deseja?' },
                { role: 'user', content: 'Quero criar um pedido para o Açaí Especial 500ml na rua Fictícia 123. Meu nome é Tester e o fone é 999999.' }
            ]
        };

        const startTime = Date.now();
        const res = await fetch('http://localhost:3000/api/ai/tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - startTime;

        const data = await res.json();
        console.log(`[Status ${res.status}] em ${duration}ms`);
        console.log(`Provider: ${data.provider} | Loops executed: ${data.loopsExecuted}`);
        console.log(`\nFinal PadBase Answer:\n${data.reply}`);

    } catch (err) {
        console.error('Test failed:', err);
    }
}
testTools();
testTools();
