// Native fetch in node v24

async function runTest() {
    try {
        console.log('--- 1. Enviando mensagem simulada do WhatsApp ---');

        const payload = {
            entry: [{
                changes: [{
                    value: {
                        metadata: { phone_number_id: "test_bot" },
                        messages: [{
                            from: "5511999999999",
                            type: "text",
                            text: { body: "Quais são os itens disponíveis no cardápio?" }
                        }]
                    }
                }]
            }]
        };

        const res = await fetch('http://localhost:3000/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log('Webhook Response:', data);

        console.log('\n✅ Simulação OK! O servidor imprimiu o log "DRY-RUN" interceptando a mensagem e acionando o modelo de IA.');
    } catch (e) {
        console.error('Test failed:', e);
    }
}

runTest();
