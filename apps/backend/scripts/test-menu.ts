async function testMenu() {
    console.log('🔄 Testando Listagem de Cardápio App (/api/menu)...\n');
    try {
        const startTime = Date.now();
        const res = await fetch('http://localhost:3000/api/menu', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const duration = Date.now() - startTime;
        const data = await res.json();

        console.log(`[Status ${res.status}] em ${duration}ms`);
        console.log(`Itens Recebidos: ${data.length}\n`);

        console.log('🔄 Testando Busca Textual (/api/menu/search?q=granola)...');
        const resSearch = await fetch('http://localhost:3000/api/menu/search?q=granola');
        const searchData = await resSearch.json();
        console.log(`Resultado da busca: ${searchData[0]?.name || 'Nada encontrado'}`);
    } catch (err) {
        console.error('Test failed:', err);
    }
}
testMenu();
