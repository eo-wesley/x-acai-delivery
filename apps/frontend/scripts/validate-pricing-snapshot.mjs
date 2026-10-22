import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const snapshotUrl = new URL('../src/data/xacai-pricing-snapshot.json', import.meta.url);
const snapshot = JSON.parse(await fs.readFile(snapshotUrl, 'utf8'));

assert.equal(snapshot.products.length, 58, 'quantidade de produtos');
assert.equal(snapshot.fichas.length, 64, 'quantidade de fichas');
assert.equal(snapshot.components.length, 589, 'quantidade de componentes');
assert.equal(snapshot.ingredients.length, 49, 'quantidade de insumos');
assert.equal(snapshot.portions.length, 31, 'quantidade de porções');
assert.equal(snapshot.collection.length, 31, 'quantidade de itens de coleta');

const policy = snapshot.pricingScope.paymentFeePolicy;
assert.equal(policy.pricingReservePercent, 5);
assert.equal(policy.targetContributionMarginPercent, 35);

const monte700 = snapshot.pricingScope.approvedPrices.M700;
assert.equal(monte700.price, 38.9);
assert.match(monte700.status, /aprovado/i);
assert.match(monte700.status, /não publicado/i);

const marmitex700 = snapshot.pricingScope.approvedPrices.MX700;
assert.equal(marmitex700.price, 38.9);
assert.match(marmitex700.status, /aprovado/i);
assert.match(marmitex700.status, /não publicado/i);

const duoPrices = ['DUO300', 'DUO400', 'DUO500', 'DUO700'].map(key => snapshot.pricingScope.approvedPrices[key].price);
assert.deepEqual(duoPrices, [23.9, 29.9, 36.9, 49.9]);

const pacokita = snapshot.fixedCupPricing.batches['Açaí X-Paçokita'].items;
assert.deepEqual(pacokita.map(item => item.sizeMl), [300, 400, 500, 700]);
assert.deepEqual(pacokita.map(item => item.recommendedPrice), [12.9, 15.9, 19.9, 26.9]);
assert.deepEqual(pacokita.map(item => item.finishedWeightGrams), [310, 410, 510, 710]);
assert.deepEqual(pacokita.map(item => item.acaiGrams), [200, 300, 400, 600]);
assert.deepEqual(pacokita.map(item => item.ingredientsGrams), Array(4).fill({ cremeDeAmendoim: 40, leiteCondensado: 30, pacoca: 40 }));
assert.deepEqual(pacokita.map(item => item.complementGrams), [110, 110, 110, 110]);
assert.deepEqual(pacokita.map(item => item.perLayerGrams), Array(4).fill({ cremeDeAmendoim: 10, leiteCondensado: 7.5, pacoca: 10 }));
const expectedPacokitaCosts = [6.576351495546179, 8.375240384435068, 10.144129273323957, 13.891907051101734];
for (const [index, item] of pacokita.entries()) {
    assert.ok(Math.abs(item.totalDirectCost - expectedPacokitaCosts[index]) < 0.000001);
    assert.match(item.status, /aprovado/i);
    assert.match(item.status, /não publicado/i);
}
const pacokitaApprovedPrices = ['PACOKITA300', 'PACOKITA400', 'PACOKITA500', 'PACOKITA700'].map(key => snapshot.pricingScope.approvedPrices[key].price);
assert.deepEqual(pacokitaApprovedPrices, [12.9, 15.9, 19.9, 26.9]);
for (const key of ['PACOKITA300', 'PACOKITA400', 'PACOKITA500', 'PACOKITA700']) {
    assert.match(snapshot.pricingScope.approvedPrices[key].status, /não publicado/i);
}
assert.equal(snapshot.fixedCupPricing.currentFamily, 'concluído');
assert.equal(snapshot.fixedCupPricing.completedFamilies, 6);
const chocola300 = snapshot.fixedCupPricing.batches['Açaí X-Chocolá'].items[0];
assert.equal(chocola300.sizeMl, 300);
assert.equal(chocola300.acaiGrams, 188);
assert.deepEqual(chocola300.ingredientsGrams, { cremeDeAvela: 42, leiteCondensado: 40, leiteEmPo: 40 });
assert.equal(chocola300.complementGrams, 122);
assert.equal(chocola300.finishedWeightGrams, 310);
assert.ok(Math.abs(chocola300.totalDirectCost - 7.964800018752929) < 0.000001);
assert.ok(Math.abs(chocola300.mathematicalMinimumPrice - 13.27466669792155) < 0.000001);
assert.equal(chocola300.recommendedPrice, 14.9);
assert.ok(Math.abs(chocola300.contributionMarginPercent - 41.54496631709443) < 0.000001);
assert.match(chocola300.status, /preço aprovado/i);
assert.match(chocola300.status, /não publicado/i);
assert.equal(snapshot.pricingScope.approvedPrices.CHOCOLA300.price, 14.9);
const chocola400 = snapshot.fixedCupPricing.batches['Açaí X-Chocolá'].items[1];
assert.equal(chocola400.sizeMl, 400);
assert.equal(chocola400.acaiGrams, 278);
assert.deepEqual(chocola400.ingredientsGrams, { cremeDeAvela: 52, leiteCondensado: 40, leiteEmPo: 40 });
assert.equal(chocola400.complementGrams, 132);
assert.equal(chocola400.finishedWeightGrams, 410);
assert.ok(Math.abs(chocola400.totalDirectCost - 10.03230001875293) < 0.000001);
assert.ok(Math.abs(chocola400.mathematicalMinimumPrice - 16.720500031254883) < 0.000001);
assert.equal(chocola400.recommendedPrice, 18.9);
assert.ok(Math.abs(chocola400.contributionMarginPercent - 41.91904751982577) < 0.000001);
assert.match(chocola400.status, /preço aprovado/i);
assert.equal(snapshot.pricingScope.approvedPrices.CHOCOLA400.price, 18.9);
const chocola500 = snapshot.fixedCupPricing.batches['Açaí X-Chocolá'].items[2];
assert.equal(chocola500.sizeMl, 500);
assert.equal(chocola500.acaiGrams, 360);
assert.deepEqual(chocola500.ingredientsGrams, { cremeDeAvela: 66, leiteCondensado: 44, leiteEmPo: 40 });
assert.equal(chocola500.complementGrams, 150);
assert.equal(chocola500.finishedWeightGrams, 510);
assert.ok(Math.abs(chocola500.totalDirectCost - 12.180574983591185) < 0.000001);
assert.ok(Math.abs(chocola500.mathematicalMinimumPrice - 20.30095830598531) < 0.000001);
assert.equal(chocola500.recommendedPrice, 22.9);
assert.ok(Math.abs(chocola500.contributionMarginPercent - 41.80971622885945) < 0.000001);
assert.match(chocola500.status, /preço aprovado/i);
assert.equal(snapshot.pricingScope.approvedPrices.CHOCOLA500.price, 22.9);
const chocola700 = snapshot.fixedCupPricing.batches['Açaí X-Chocolá'].items[3];
assert.equal(chocola700.sizeMl, 700);
assert.equal(chocola700.acaiGrams, 522);
assert.deepEqual(chocola700.ingredientsGrams, { cremeDeAvela: 80, leiteCondensado: 60, leiteEmPo: 48 });
assert.equal(chocola700.complementGrams, 188);
assert.equal(chocola700.finishedWeightGrams, 710);
assert.ok(Math.abs(chocola700.totalDirectCost - 16.478619287388653) < 0.000001);
assert.ok(Math.abs(chocola700.mathematicalMinimumPrice - 27.46436547898109) < 0.000001);
assert.equal(chocola700.recommendedPrice, 30.9);
assert.ok(Math.abs(chocola700.contributionMarginPercent - 41.67113499226972) < 0.000001);
assert.match(chocola700.status, /preço aprovado/i);
assert.equal(snapshot.pricingScope.approvedPrices.CHOCOLA700.price, 30.9);
const tropical = snapshot.fixedCupPricing.batches['Açaí X-Tropical'].items;
assert.deepEqual(tropical.map(item => item.sizeMl), [300, 400, 500, 700]);
assert.deepEqual(tropical.map(item => item.acaiGrams), [148, 240, 330, 460]);
assert.deepEqual(tropical.map(item => item.complementGrams), [162, 170, 180, 250]);
assert.deepEqual(tropical.map(item => item.finishedWeightGrams), [310, 410, 510, 710]);
assert.deepEqual(tropical.map(item => item.recommendedPrice), [16.9, 20.9, 24.9, 33.9]);
const expectedTropicalCosts = [8.889244463197372, 10.903022240975153, 12.940522240975152, 17.890508176277546];
for (const [index, item] of tropical.entries()) {
    assert.ok(Math.abs(item.totalDirectCost - expectedTropicalCosts[index]) < 0.000001);
    assert.match(item.status, /aprovado/i);
    assert.match(item.status, /não publicado/i);
    assert.ok(item.recommendedPrice >= item.totalDirectCost / 0.6, `${item.sizeMl} ml tropical abaixo do mínimo técnico`);
}
assert.deepEqual(['TROPICAL300', 'TROPICAL400', 'TROPICAL500', 'TROPICAL700'].map(key => snapshot.pricingScope.approvedPrices[key].price), [16.9, 20.9, 24.9, 33.9]);

const approvedFamilies = [
    {
        name: 'Açaí X-Creme',
        keys: ['CREME300', 'CREME400', 'CREME500', 'CREME700'],
        acai: [190, 278, 330, 482],
        complements: [120, 132, 180, 228],
        costs: [9.037817037037037, 11.14059925925926, 14.125061481481483, 19.102972592592593],
        prices: [17.9, 21.9, 26.9, 35.9],
    },
    {
        name: 'Açaí X-Tella',
        keys: ['TELLA300', 'TELLA400', 'TELLA500', 'TELLA700'],
        acai: [189, 278, 369, 526],
        complements: [121, 132, 141, 184],
        costs: [8.90632736918028, 11.26050001875293, 13.434064272783006, 18.287713304482672],
        prices: [17.9, 21.9, 26.9, 36.9],
    },
    {
        name: 'Açaí X-King Tella',
        keys: ['KINGTELLA300', 'KINGTELLA400', 'KINGTELLA500', 'KINGTELLA700'],
        acai: [179, 270, 360, 505],
        complements: [131, 140, 150, 205],
        costs: [8.507438480291391, 10.760650446103357, 13.034342753795665, 17.930046637816005],
        prices: [17.9, 21.9, 26.9, 36.9],
    },
];

for (const family of approvedFamilies) {
    const items = snapshot.fixedCupPricing.batches[family.name].items;
    assert.deepEqual(items.map(item => item.sizeMl), [300, 400, 500, 700]);
    assert.deepEqual(items.map(item => item.finishedWeightGrams), [310, 410, 510, 710]);
    assert.deepEqual(items.map(item => item.acaiGrams), family.acai);
    assert.deepEqual(items.map(item => item.complementGrams), family.complements);
    assert.deepEqual(items.map(item => item.recommendedPrice), family.prices);
    assert.deepEqual(family.keys.map(key => snapshot.pricingScope.approvedPrices[key].price), family.prices);
    for (const [index, item] of items.entries()) {
        assert.ok(Math.abs(item.totalDirectCost - family.costs[index]) < 0.000001);
        assert.match(item.status, /aprovado/i);
        assert.match(item.status, /não publicado/i);
        assert.ok(item.recommendedPrice >= item.totalDirectCost / 0.6, `${family.name} ${item.sizeMl} ml abaixo do mínimo técnico`);
    }
}
for (const item of pacokita) {
    assert.ok(item.recommendedPrice >= item.totalDirectCost / 0.6, `${item.sizeMl} ml abaixo do mínimo técnico`);
}

console.log('Snapshot de precificação RXA: 190 verificações aprovadas.');
