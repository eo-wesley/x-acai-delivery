async function runToolTest() {
    console.log('🔄 Testando /ai/chat com intenção de Tool Calling...\n');
    try {
        const res = await fetch('http://localhost:3000/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Qual o valor da entrega pro centro?' }],
                temperature: 0.1
            })
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log(`Response:`, data);
    } catch (err) {
        console.error('Test failed:', err);
    }
}

runToolTest();
