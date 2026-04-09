const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../tmp/ifood-normalized.json');
const destPath = path.join(__dirname, '../tmp/ifood-normalized-augmented.json');

const data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

const iFoodBaseImage = 'https://static.ifood-static.com.br/image/upload/t_high/pratos/';

const acompanhamentosGrautus = [
    { name: 'Leite em Pó', price_cents: 0, available: true, sort_order: 0 },
    { name: 'Leite Condensado', price_cents: 0, available: true, sort_order: 1 },
    { name: 'Paçoca', price_cents: 0, available: true, sort_order: 2 },
    { name: 'Granola', price_cents: 0, available: true, sort_order: 3 },
    { name: 'Amendoim Triturado', price_cents: 0, available: true, sort_order: 4 },
    { name: 'Chocoball', price_cents: 0, available: true, sort_order: 5 },
    { name: 'Confete', price_cents: 0, available: true, sort_order: 6 },
    { name: 'Mel', price_cents: 0, available: true, sort_order: 7 },
    { name: 'Calda de Morango', price_cents: 0, available: true, sort_order: 8 },
    { name: 'Calda de Chocolate', price_cents: 0, available: true, sort_order: 9 },
];

const adicionaisExtras = [
    { name: 'Nutella', price_cents: 500, available: true, sort_order: 0 },
    { name: 'Ouro Branco', price_cents: 350, available: true, sort_order: 1 },
    { name: 'Sonho de Valsa', price_cents: 350, available: true, sort_order: 2 },
    { name: 'Morango', price_cents: 400, available: true, sort_order: 3 },
    { name: 'Banana', price_cents: 300, available: true, sort_order: 4 },
    { name: 'Kiwi', price_cents: 450, available: true, sort_order: 5 },
    { name: 'Gota de Chocolate', price_cents: 300, available: true, sort_order: 6 },
    { name: 'Ovomaltine', price_cents: 400, available: true, sort_order: 7 },
];

data.forEach((item) => {
    // Fix image URL
    if (item.image_url && !item.image_url.startsWith('http')) {
        item.image_url = `${iFoodBaseImage}${item.image_url}`;
    }

    // Identify if the item allows choosing complements
    const isMonteSeu = item.category?.toLowerCase().includes('monte') || item.name.toLowerCase().includes('grátis');
    const isCombo = item.category?.toLowerCase().includes('combos');

    if (item.option_groups.length === 0) {
        if (isCombo) {
            item.option_groups.push({
                name: 'Escolha seus Copos',
                min_select: 2,
                max_select: 2,
                required: true,
                sort_order: 0,
                options: [
                    { name: 'Açaí X-Tradicional', price_cents: 0, available: true, sort_order: 0 },
                    { name: 'Açaí X-Paçoleite', price_cents: 0, available: true, sort_order: 1 },
                    { name: 'Açaí X-Splash', price_cents: 0, available: true, sort_order: 2 },
                    { name: 'Açaí X-King Paçoca', price_cents: 0, available: true, sort_order: 3 }
                ]
            });
        } else if (isMonteSeu) {
            // Extract the number of free complements from the title (ex: "Grátis 3 Complementos")
            let freeCount = 3;
            const match = item.name.match(/(\d+)\s+Complementos/i);
            if (match) {
                freeCount = parseInt(match[1]);
            }

            item.option_groups.push({
                name: `Acompanhamentos (Escolha ${freeCount})`,
                min_select: 1,
                max_select: freeCount,
                required: true,
                sort_order: 0,
                options: acompanhamentosGrautus
            });

            item.option_groups.push({
                name: 'Adicionais Extras Premium',
                min_select: 0,
                max_select: 10,
                required: false,
                sort_order: 1,
                options: adicionaisExtras
            });
        } else if (item.category?.toLowerCase().includes('açaí')) {
             // Mesmo pros pré-montados, vamos adicionar extras
             item.option_groups.push({
                name: 'Turbine seu Açaí com Extras Premium',
                min_select: 0,
                max_select: 10,
                required: false,
                sort_order: 0,
                options: adicionaisExtras
            });
        }
    }
});

fs.writeFileSync(destPath, JSON.stringify(data, null, 2));
console.log(`[Augment] Processados ${data.length} itens.`);
console.log(`[Augment] Salvo em: ${destPath}`);
