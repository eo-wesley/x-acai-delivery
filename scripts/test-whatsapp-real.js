/**
 * test-whatsapp-real.js
 * Testa o envio de mensagem WhatsApp via Evolution API local.
 * 
 * Uso:
 *   node scripts/test-whatsapp-real.js 5511999990000
 *   node scripts/test-whatsapp-real.js 5511999990000 "Mensagem personalizada"
 * 
 * Pré-requisitos:
 *   - Evolution API rodando: docker compose -f docker-compose-evolution.yml up -d
 *   - Instância pareada com WhatsApp (escanear QR em http://localhost:8080/manager)
 */

const BASE_URL = process.env.WHATSAPP_BASE_URL || 'http://localhost:8080';
const INSTANCE = process.env.WHATSAPP_INSTANCE || 'acai-delivery';
const API_KEY = process.env.WHATSAPP_API_KEY || 'xacai-secret-api-key-2024';

const phone = process.argv[2];
const custom = process.argv[3];

async function checkInstance() {
    const url = `${BASE_URL}/instance/fetchInstances`;
    const res = await fetch(url, { headers: { apikey: API_KEY } });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const list = await res.json();
    const inst = Array.isArray(list) ? list.find(i => i.name === INSTANCE || i.instance?.instanceName === INSTANCE) : null;
    return inst;
}

async function createInstance() {
    console.log(`📱 Criando instância '${INSTANCE}'...`);
    const res = await fetch(`${BASE_URL}/instance/create`, {
        method: 'POST',
        headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: INSTANCE, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    });
    const body = await res.json();
    if (res.ok || res.status === 409) {
        console.log(`✅ Instância pronta`);
        return body;
    }
    throw new Error(`Falha ao criar instância: ${JSON.stringify(body)}`);
}

async function getQrCode() {
    const res = await fetch(`${BASE_URL}/instance/connect/${INSTANCE}`, {
        headers: { apikey: API_KEY },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function sendMessage(toPhone, text) {
    const sanitized = toPhone.replace(/\D/g, '');
    const number = sanitized.length <= 11 ? '55' + sanitized : sanitized;

    console.log(`\n📤 Enviando para ${number}...`);
    console.log(`   "${text.substring(0, 80)}..."`);

    const res = await fetch(`${BASE_URL}/message/sendText/${INSTANCE}`, {
        method: 'POST',
        headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, text, delay: 1000 }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`Erro ${res.status}: ${JSON.stringify(body)}`);
    return body;
}

async function main() {
    console.log('\n🔍 X-Açaí WhatsApp Real Test');
    console.log(`   Evolution API : ${BASE_URL}`);
    console.log(`   Instância     : ${INSTANCE}\n`);

    // 1. Verificar se Evolution responde
    let reachable = false;
    try {
        const r = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(5000) });
        reachable = r.status < 500;
    } catch { }

    if (!reachable) {
        console.error('❌ Evolution API não está acessível em', BASE_URL);
        console.log('\n💡 Para iniciar a Evolution API:');
        console.log('   docker compose -f docker-compose-evolution.yml up -d');
        console.log('\n   Aguarde ~30s e execute novamente este script.\n');
        process.exit(1);
    }
    console.log('✅ Evolution API online');

    // 2. Verificar/criar instância
    let inst = await checkInstance().catch(() => null);
    if (!inst) {
        await createInstance();
        inst = await checkInstance().catch(() => null);
    }

    const status = inst?.connectionStatus || inst?.instance?.status || 'unknown';
    console.log(`   Status        : ${status}`);

    if (status !== 'open') {
        console.log('\n⚠️  WhatsApp NÃO está pareado ainda.');
        console.log('   Passos para parear:');
        console.log('   1. Abra: http://localhost:8080/manager');
        console.log(`   2. API Key: ${API_KEY}`);
        console.log(`   3. Conecte a instância "${INSTANCE}" e escaneie o QR`);

        try {
            const qr = await getQrCode();
            if (qr.base64) {
                console.log('\n   QR Code gerado! Use o link abaixo para visualizar:');
                console.log(`   http://localhost:8080/instance/connect/${INSTANCE}`);
            }
        } catch (e) {
            console.log(`\n   (Para gerar QR: GET ${BASE_URL}/instance/connect/${INSTANCE} com Header apikey: ${API_KEY})`);
        }

        if (!phone) {
            console.log('\n⚠️  Nenhum número fornecido. Pareie o WhatsApp primeiro e então execute:');
            console.log('   node scripts/test-whatsapp-real.js 5511999990000\n');
            process.exit(0);
        }
        process.exit(1);
    }

    // 3. Enviar mensagem
    if (!phone) {
        console.log('\n💡 WhatsApp pareado! Para enviar mensagem de teste, passe o número:');
        console.log('   node scripts/test-whatsapp-real.js 5511999990000\n');
        process.exit(0);
    }

    const msg = custom ||
        `🍇 *X-Açaí Delivery* — Teste de Integração WhatsApp\n\n` +
        `✅ A integração com Evolution API está funcionando!\n\n` +
        `📦 Pedido de teste #XACAI01\n` +
        `👤 Cliente: Teste Real\n` +
        `🛒 Itens: 1x Açaí 500ml\n` +
        `   └ Base: Tapioca\n` +
        `   └ Cobertura: Morango (+R$ 2,00)\n` +
        `💰 Total: R$ 25,00\n` +
        `💳 Pagamento: PIX\n` +
        `📍 Endereço: Rua dos Testes, 100\n\n` +
        `_Mensagem automática gerada em ${new Date().toLocaleTimeString('pt-BR')}_`;

    try {
        const result = await sendMessage(phone, msg);
        const msgId = result?.key?.id || result?.messageId || '?';
        console.log(`\n✅ Mensagem enviada com sucesso!`);
        console.log(`   ID: ${msgId}`);
        console.log(`   Para: ${phone}\n`);
    } catch (e) {
        console.error(`\n❌ Falha ao enviar: ${e.message}\n`);
        process.exit(1);
    }
}

main().catch(e => {
    console.error('❌ Erro inesperado:', e.message);
    process.exit(1);
});
