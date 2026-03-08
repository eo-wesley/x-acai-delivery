// Test Script for POST /ai/chat
async function testChat() {
    console.log('🔄 Testando Bate-Papo Simples com Cache (/ai/chat)...\n');
    try {
        const payload = {
            messages: [{ role: 'user', content: 'Responda com uma única palavra: Oie' }],
            temperature: 0.1
        };

        const startTime = Date.now();
        const res = await fetch('http://localhost:3000/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - startTime;

        const data = await res.json();
        console.log(`[Status ${res.status}] em ${duration}ms`);
        console.log(`Response:`, data);

        console.log('\n🔄 Refazendo a mesma chamada para validar cache (Deve ser < 200ms)...');
        const startCache = Date.now();
        const resCache = await fetch('http://localhost:3000/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const durationCache = Date.now() - startCache;
        const dataCache = await resCache.json();
        console.log(`[Status ${resCache.status}] em ${durationCache}ms`);
        console.log(`Cached?:`, dataCache.cached);

    } catch (err) {
        console.error('Test failed:', err);
    }
}
testChat();
