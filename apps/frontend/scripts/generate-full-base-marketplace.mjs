import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');
const repoRoot = path.resolve(frontendRoot, '..', '..');
const workspaceRoot = path.resolve(repoRoot, '..');
const snapshotPath = path.join(frontendRoot, 'src', 'data', 'xacai-pricing-snapshot.json');
const jsonOutput = path.join(frontendRoot, 'src', 'data', 'xacai-full-base-marketplace.json');
const reportOutput = path.join(workspaceRoot, 'outputs', 'ficha_tecnica_fechamento_2026-10-17', 'CUSTO_CHEIO_E_PRECO_SUGERIDO_POR_APP_2026-11-06.md');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

const fixedProducts = new Set([
  'Açaí X-Chocolá', 'Açaí X-Chocolã', 'Açaí X-Creme', 'Açaí X-King Paçoca', 'Açaí X-King Tella',
  'Açaí X-Paçokita', 'Açaí X-Paçoleite', 'Açaí X-Splash', 'Açaí X-Tella', 'Açaí X-Tradicional', 'Açaí X-Tropical'
]);
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const nominalSize = (value) => Number(value.match(/\b(300|400|500|700)\s*ml\b/i)?.[1] || 0);
const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const roundToNinety = (value) => Math.ceil(value + 0.1) - 0.1;
const suggested = (cost, margin, fee) => roundToNinety(cost / (1 - ((margin + fee) / 100)));
const brl = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const seen = new Set();
const fixed = snapshot.fichas.flatMap((recipe) => {
  if (!fixedProducts.has(recipe.product)) return [];
  const sizeMl = nominalSize(recipe.variant);
  if (!sizeMl || recipe.ingredients === null || recipe.packaging === null) return [];
  const product = recipe.product.replace(/^Açaí\s+/i, '').replace('X-Chocolã', 'X-Chocolá');
  const id = `${normalize(product)}-${sizeMl}`;
  if (seen.has(id)) return [];
  seen.add(id);
  return [{
    id,
    product,
    sizeMl,
    kind: 'receita fixa',
    detail: 'base cheia + receita fixa + embalagem completa',
    cost: roundMoney((sizeMl * snapshot.directCostBasis.acaiCostPerGram) + recipe.ingredients + recipe.packaging)
  }];
});

const freePortions = snapshot.portions
  .filter((portion) => normalize(portion.complement) !== 'kiwi' && /gr[aá]tis/i.test(portion.menuType))
  .map((portion) => ({
    name: portion.complement,
    cost: (portion.inputPrice / portion.packQuantity) * portion.portionQuantity
  }))
  .filter((portion) => Number.isFinite(portion.cost))
  .sort((a, b) => b.cost - a.cost);
const definitions = [
  ['monte-300', 'Monte Seu', 300, 3, snapshot.directCostBasis.packagingCostBySize['300']],
  ['monte-400', 'Monte Seu', 400, 3, snapshot.directCostBasis.packagingCostBySize['400']],
  ['monte-500', 'Monte Seu', 500, 3, snapshot.directCostBasis.packagingCostBySize['500']],
  ['monte-700', 'Monte Seu', 700, 4, snapshot.directCostBasis.packagingCostBySize['700']],
  ['marmitex-500', 'Marmitex', 500, 3, snapshot.directCostBasis.marmitex500PackagingCost],
  ['marmitex-700', 'Marmitex', 700, 4, snapshot.directCostBasis.marmitex700PackagingCost]
];
const variable = definitions.map(([id, product, sizeMl, choices, packaging]) => ({
  id,
  product,
  sizeMl,
  kind: 'mix seguro',
  detail: `base cheia + ${choices} complementos mais caros + embalagem completa`,
  cost: roundMoney((sizeMl * snapshot.directCostBasis.acaiCostPerGram) + packaging + freePortions.slice(0, choices).reduce((sum, portion) => sum + portion.cost, 0))
}));

const margin = 35;
const channels = [
  ['direct', 'Direto / próprio', 0],
  ['ifoodOwn', 'iFood entrega própria', 15.2],
  ['ifoodPartner', 'iFood entrega parceira', 26.2],
  ['keeta', 'Keeta', 13],
  ['food99', '99Food', 18]
];
const rows = [...fixed, ...variable]
  .map((item) => ({
    ...item,
    prices: Object.fromEntries(channels.map(([id, , fee]) => [id, roundMoney(suggested(item.cost, margin, fee))]))
  }))
  .sort((a, b) => a.cost - b.cost);

if (fixed.length !== 40 || variable.length !== 6 || rows.length !== 46) {
  throw new Error(`Catálogo incompleto: fixos=${fixed.length}, variáveis=${variable.length}, total=${rows.length}`);
}

fs.writeFileSync(jsonOutput, `${JSON.stringify({ generatedAt: '2026-11-06', targetMarginPercent: margin, channels: Object.fromEntries(channels.map(([id, label, fee]) => [id, { label, feePercent: fee, confirmed: id === 'direct' }])), rows }, null, 2)}\n`);

const report = `---
type: tabela-canonica
projeto: X-Açaí
processo: custo-cheio-e-preco-sugerido-por-aplicativo
status: calculado-taxas-editaveis
registros: 46
updated: 2026-11-06
---

# Custo cheio e preço sugerido por aplicativo — X-Açaí

## Regra corrigida

- Copos fixos: tamanho nominal cheio de açaí + receita fixa + copo, tampa, colher, guardanapo, saquinho e saco aplicável.
- Monte Seu e Marmitex: tamanho nominal cheio de açaí + 3 ou 4 complementos grátis do mix ativo mais caro + embalagem completa.
- Kiwi pausado e adicionais pagos não entram no mix grátis.
- Preço sugerido = custo total ÷ (1 − sobra desejada − taxa do canal), arredondado para cima em final 90.
- Sobra desejada usada nesta fotografia: 35%.

## Taxas usadas como referência editável

| Canal | Taxa usada | Estado |
|---|---:|---|
${channels.map(([, label, fee]) => `| ${label} | ${fee.toFixed(1).replace('.', ',')}% | ${label === 'Direto / próprio' ? '0% definido para esta simulação' : 'referência do simulador; confirmar contrato'} |`).join('\n')}

## Tabela em ordem do menor custo para o maior

| Produto | Tamanho | Custo total | Direto/próprio | iFood própria | iFood parceira | Keeta | 99Food |
|---|---:|---:|---:|---:|---:|---:|---:|
${rows.map((row) => `| ${row.product} | ${row.sizeMl} ml | ${brl(row.cost)} | ${brl(row.prices.direct)} | ${brl(row.prices.ifoodOwn)} | ${brl(row.prices.ifoodPartner)} | ${brl(row.prices.keeta)} | ${brl(row.prices.food99)} |`).join('\n')}

## Portão

Os preços são sugestões calculadas, não preços aprovados nem publicados. Antes de usar em cada aplicativo, substituir as taxas de referência pelas taxas reais do contrato na tela interativa do aplicativo oficial.
`;
fs.writeFileSync(reportOutput, report, 'utf8');
console.log(`Catálogo validado: ${fixed.length} fixos + ${variable.length} variáveis = ${rows.length}.`);
console.log(jsonOutput);
console.log(reportOutput);
