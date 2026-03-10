import axios from 'axios';

const API_URL = 'http://localhost:3000/api/migration';

async function simulateFunnel() {
    console.log('🧪 Simulating Anti-iFood Funnel...');

    // 1. Simular Scan de QR Code
    console.log('- Scanning QR Code...');
    // Assumindo que o ID da campanha existe ou apenas testando a rota
    // await axios.get(`${API_URL}/qr/camp_123`);

    // 2. Simular Conversão na Landing Page
    console.log('- Converting customer...');
    try {
        const res = await axios.post(`${API_URL}/convert`, {
            phone: '5511999999999',
            name: 'Joao da Silva',
            restaurantId: 'rest_001',
            campaignId: 'camp_123',
            source: 'qr_campaign'
        });
        console.log('✅ Conversion successful:', res.data);
    } catch (e: any) {
        console.error('❌ Conversion failed (expected if server not running):', e.message);
    }

    // 3. Verificar Analytics
    console.log('- Fetching Analytics...');
    try {
        const stats = await axios.get(`${API_URL}/analytics?restaurantId=rest_001`);
        console.log('📊 Stats:', stats.data);
    } catch (e: any) {
        console.error('❌ Analytics failed:', e.message);
    }
}

// simulateFunnel(); // Descomentar para rodar localmente
console.log('Script pronto para validação de funil.');
