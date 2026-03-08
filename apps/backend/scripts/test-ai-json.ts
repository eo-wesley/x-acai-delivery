// Test Script for POST /ai/json
async function testJson() {
    console.log('🔄 Testando Geração de JSON Estrito (/ai/json)...\n');
    try {
        const payload = {
            messages: [{ role: 'user', content: 'Quero dois açaís de 700ml com granola para a rua central 123 pagando em pix' }],
            schemaName: 'OrderIntent' // Based on existing schema in your code
        };

        const startTime = Date.now();
        const res = await fetch('http://localhost:3000/ai/json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - startTime;

        const data = await res.json();
        console.log(`[Status ${res.status}] em ${duration}ms`);
        console.log(`Structured Intent Response:\n`, JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('Test failed:', err);
    }
}
testJson();
