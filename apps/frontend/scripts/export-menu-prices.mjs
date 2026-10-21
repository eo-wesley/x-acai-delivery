import fs from 'node:fs/promises';
import path from 'node:path';
import { buildMenuPrices, menuPricesCsv, priceMoney, priceStatusLabels } from '../src/lib/menu-prices.ts';

const snapshot = JSON.parse(await fs.readFile(new URL('../src/data/xacai-pricing-snapshot.json', import.meta.url), 'utf8'));
const rows = buildMenuPrices(snapshot);
const directory = path.resolve(process.argv[2] || '../../outputs/cardapio-precos-2026-10-20');
await fs.mkdir(directory, { recursive: true });
await fs.writeFile(path.join(directory, 'Cardapio_X-Acai_Completo.csv'), menuPricesCsv(rows));
const lines = [
    '# Cardápio X-Açaí — tabela completa para revisão', '',
    `Base canônica: ${snapshot.asOf}. Canal próprio/Takeat e presencial.`, '',
    '**Aprovado**: preço já decidido. **Recomendado**: proposta aguardando revisão. **Antigo · revisar**: referência histórica preservada; não é um preço novo aprovado. Nenhum preço desta exportação foi publicado na Takeat.', '',
    '| Produto | Tamanho | Antigo (referência) | Preço para revisão | Situação |',
    '| --- | --- | ---: | ---: | --- |',
    ...rows.map(row => `| ${row.name} | ${row.size} | ${priceMoney(row.legacyPrice)} | ${priceMoney(row.price)} | ${priceStatusLabels[row.status]}${row.name === 'Kiwi' ? '; pausado' : ''} |`), '',
    `${snapshot.products.length} produtos + ${snapshot.portions.length} adicionais. Os ajustes feitos na tela administrativa são rascunhos locais, exportáveis, e não substituem esta base aprovada sem uma nova decisão.`, ''
];
await fs.writeFile(path.join(directory, 'Cardapio_X-Acai_Completo.md'), lines.join('\n'));
console.log(JSON.stringify({ directory, products: snapshot.products.length, addons: snapshot.portions.length, approved: rows.filter(row => row.status === 'approved').length, recommended: rows.filter(row => row.status === 'proposed').length, legacy: rows.filter(row => row.status === 'legacy').length }));
