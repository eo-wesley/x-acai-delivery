const assert = require('node:assert/strict');

async function main() {
    const base = process.argv[2] || 'http://localhost:3005';
    const page = await fetch(`${base}/product/7415285a-c203-4974-9b67-feb09156fceb`);
    assert.equal(page.status, 200);
    const html = await page.text();
    const paths = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(match => match[1].replaceAll('&amp;', '&'));
    const chunks = await Promise.all(paths.map(async url => {
        const response = await fetch(new URL(url, base));
        assert.equal(response.status, 200);
        return response.text();
    }));
    const code = chunks.join('\n');
    for (const label of ['Copo de 700ml', 'Turbinando o Açaí', 'Creme De Avelã', 'Vai uma Bebida?', 'Vai o quê?', 'Cupuaçu', 'Colher']) {
        assert.ok(code.includes(label), `Código entregue ao celular deve conter ${label}`);
    }
    const catalog = await fetch(`${base}/default-menu.json`);
    assert.equal(catalog.status, 200);
    const menu = await catalog.json();
    assert.equal(menu.filter(item => item.category === 'Açaí Copos da Promoção').length, 10);
    assert.equal(menu.filter(item => item.category === 'Açaí Monte O Seu').length, 10);
    const montePage = await fetch(`${base}/product/fffb5892-7684-49d0-977c-32b910bc93d4`);
    assert.equal(montePage.status, 200);
    console.log(`OK: ${base} entrega os copos da promoção e o Monte o Seu com massa e colher.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
