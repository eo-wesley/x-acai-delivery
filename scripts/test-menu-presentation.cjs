const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../apps/frontend/node_modules/typescript');

const sourcePath = path.join(__dirname, '../apps/frontend/src/lib/menu-presentation.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const result = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  reportDiagnostics: true,
});
assert.equal(result.diagnostics.length, 0, 'The presentation helpers must transpile without diagnostics.');
const context = { exports: {} };
vm.runInNewContext(result.outputText, context, { filename: sourcePath });
const {
  PUBLIC_CATEGORY_TABS, sortPublicMenuItems, getMenuCategoryTabs, getInitialMenuCategory,
  getMenuDisplayName, getEditorialHighlights, filterMenuItems, isMenuItemAvailable, getMenuPriceLabel, getMenuCardDescription,
} = context.exports;
const menu = JSON.parse(fs.readFileSync(path.join(__dirname, '../apps/frontend/public/default-menu.json'), 'utf8'));
const initialCatalog = JSON.stringify(menu);
const plain = value => JSON.parse(JSON.stringify(value));
const sorted = sortPublicMenuItems(menu);
let checks = 0;
function check(name, fn) {
  fn();
  checks += 1;
  console.log(`PASS ${name}`);
}

check('the menu opens with açaí and keeps beverages last', () => {
  assert.deepEqual(plain(PUBLIC_CATEGORY_TABS.map(tab => tab.label)), [
    'Açaí Copos da Promoção', 'Açaí Combos', 'Açaí Monte O Seu', 'Vai uma Bebida?',
  ]);
  assert.equal(getInitialMenuCategory(sorted), 'acai copos da promocao');
  assert.equal(sorted.at(-1).category.replace(/ \?$/, '?'), 'Vai uma Bebida?');
});

check('ready recipes follow the documented editorial order, keeping one card per recipe', () => {
  assert.deepEqual(plain(sorted.filter(item => item.category === 'Açaí Copos da Promoção').map(item => item.name)), [
    'Açaí X-Tradicional', 'Açaí X-King Paçoca', 'Açaí X-Splash', 'Açaí X-Paçoleite',
    'Açaí X-Paçokita', 'Açaí X-Chocolã', 'Açaí X-Tropical', 'Açaí X-Creme', 'Açaí X-Tella', 'Açaí X-King Tella',
  ]);
});

check('custom formats group cups, marmitex, boats, litre and roleta', () => {
  const formats = sorted.filter(item => item.category === 'Açaí Monte O Seu');
  assert.deepEqual(plain(formats.map(item => item.name)), [
    'Açaí 300ml Gratis 3 Complementos', 'Açaí 400ml Grátis 3 Complementos',
    'Açaí 500ml Grátis 3 Complementos', 'Açaí 700ml Grátis 4 Complementos',
    'Açaí Marmitex 500ml Grátis 3 Complementos', 'Açaí Marmitex 700ml Grátis 4 Complementos',
    'Açaí Barca P Grátis 6 Complementos', 'Açaí Barca M Grátis 7 Complementos',
    'Açaí Litrão Grátis 6 Complementos', 'Açaí Roleta Grátis 6 Complementos',
  ]);
});

check('double cups use clear display names without altering catalog names or prices', () => {
  const combos = sorted.filter(item => item.category === 'Açaí Combos');
  assert.deepEqual(plain(combos.map(getMenuDisplayName)), [300, 400, 500, 700].map(size => `Dupla X-Açaí — 2 copos de ${size} ml`));
  const beverage = menu.find(item => item.category.includes('Bebida'));
  assert.equal(getMenuDisplayName(beverage), beverage.name);
  assert.equal(getMenuDisplayName({ name: 'Combo individual 300 ml', category: 'Açaí Combos' }), 'Combo individual 300 ml');
  assert.equal(JSON.stringify(menu), initialCatalog);
  assert.ok(sorted.every(item => menu.includes(item)), 'Sorted items must retain their original object identity.');
});

check('editorial highlights select the three intended available products regardless of tags or catalog order', () => {
  const input = menu.toReversed().map(item => ({ ...item, tags: item.category.includes('Bebida') ? ['popular', 'promo'] : [] }));
  assert.deepEqual(plain(getEditorialHighlights(input).map(item => item.name)), [
    'Açaí X-Tradicional', 'Açaí 500ml Grátis 3 Complementos', 'Açaí 300ml Escolha 2 opções',
  ]);
  assert.equal(new Set(getEditorialHighlights(input).map(item => item.id)).size, 3);
});

check('hidden, unavailable and out-of-stock products never become highlights, for numeric or boolean flags', () => {
  for (const flag of [{ hidden: 1 }, { hidden: true }, { available: 0 }, { available: false }, { out_of_stock: 1 }, { out_of_stock: true }]) {
    assert.equal(getEditorialHighlights(menu.map(item => ({ ...item, ...flag }))).length, 0);
    assert.equal(isMenuItemAvailable(flag), false);
  }
  assert.equal(isMenuItemAvailable({ available: true, hidden: false, out_of_stock: 0 }), true);
  assert.equal(isMenuItemAvailable({}), true);
});

check('missing highlights are omitted without substituting beverages or other arbitrary items', () => {
  const withoutTradicional = menu.filter(item => item.name !== 'Açaí X-Tradicional');
  assert.equal(getEditorialHighlights(withoutTradicional).length, 2);
  assert.equal(getEditorialHighlights(menu.filter(item => item.category.includes('Bebida'))).length, 0);
});

check('the initial category falls back to the first purchasable category and excludes hidden-only tabs', () => {
  const noReadyCups = menu.map(item => item.category === 'Açaí Copos da Promoção' ? { ...item, available: false } : item);
  assert.equal(getInitialMenuCategory(noReadyCups), 'acai combos');
  const hiddenCombos = menu.map(item => item.category === 'Açaí Combos' ? { ...item, hidden: true } : item);
  assert.equal(getMenuCategoryTabs(hiddenCombos).some(tab => tab.key === 'acai combos'), false);
  assert.equal(getInitialMenuCategory([]), null);
});

check('search crosses category boundaries, supports accents and finds displayed names', () => {
  const water = filterMenuItems(sorted, 'acai copos da promocao', 'agua');
  assert.equal(water.length, 2);
  assert.ok(water.every(item => item.category.includes('Bebida')));
  assert.equal(filterMenuItems(sorted, 'acai monte o seu', 'dupla').length, 4);
  assert.equal(filterMenuItems(sorted, 'acai combos', '   ').length, 4);
  assert.equal(filterMenuItems(menu, null, 'smoke test').length, 0);
});

check('hidden and staging items remain excluded even when their text matches a search', () => {
  const input = [
    { id: 'hidden-number', name: 'Água oculta', category: 'Vai uma Bebida?', hidden: 1 },
    { id: 'hidden-bool', name: 'Água oculta', category: 'Vai uma Bebida?', hidden: true },
    { id: 'seed_menu_acai_classico', name: 'Água teste', category: 'Vai uma Bebida?' },
    { id: 'smoke', name: 'Água teste', category: 'Vai uma Bebida?', description: 'smoke test de staging' },
    { id: 'legacy', name: 'Água', category: 'Categoria interna' },
  ];
  assert.equal(sortPublicMenuItems(input).length, 0);
  assert.equal(filterMenuItems(input, null, 'água').length, 0);
});

check('entry prices explicitly identify the 300 ml cup without relabelling doubles', () => {
  for (const item of sorted.filter(item => item.category === 'Açaí Copos da Promoção')) {
    assert.equal(getMenuPriceLabel(item), '300 ml · a partir de');
  }
  assert.equal(getMenuPriceLabel({ category: 'Açaí Combos' }), 'A partir de');
});

check('new unknown items retain catalog sort order after known editorial items', () => {
  const input = [
    { id: 'new-2', name: 'Açaí X-Novo 2', category: 'Açaí Copos da Promoção', sort_order: 2 },
    { id: 'new-1', name: 'Açaí X-Novo 1', category: 'Açaí Copos da Promoção', sort_order: 1 },
    { id: 'traditional', name: 'Açaí X-Tradicional', category: 'Açaí Copos da Promoção', sort_order: 100 },
  ];
  assert.deepEqual(plain(sortPublicMenuItems(input).map(item => item.id)), ['traditional', 'new-1', 'new-2']);
});

check('ready-cup summaries expose ingredients confirmed in each original recipe', () => {
  const readyCups = sorted.filter(item => item.category === 'Açaí Copos da Promoção');
  assert.equal(readyCups.length, 10);
  for (const item of readyCups) {
    assert.ok(getMenuCardDescription(item).startsWith('Açaí com '), item.name);
    assert.ok(!getMenuCardDescription(item).includes('Obs:'), item.name);
  }
  assert.equal(getMenuCardDescription(readyCups[0]), 'Açaí com leite em pó, leite condensado e granola.');
  assert.equal(JSON.stringify(menu), initialCatalog, 'Descriptions in the source catalog must remain unchanged.');
});

check('recipe summaries fall back to current text when ingredients change or descriptions are absent', () => {
  const traditional = sorted.find(item => item.name === 'Açaí X-Tradicional');
  assert.equal(getMenuCardDescription({ ...traditional, description: 'Obs: Não pode separar os itens. Açaí com banana.' }), 'Açaí com banana.');
  assert.equal(getMenuCardDescription({ ...traditional, description: null }), '');
  assert.equal(getMenuCardDescription({ ...traditional, description: 'Este produto não permite enviar ingredientes separados. Açaí com morango.' }), 'Açaí com morango.');
  const customCup = menu.find(item => item.category === 'Açaí Monte O Seu');
  assert.equal(getMenuCardDescription(customCup), customCup.description);
});

console.log(`Menu presentation: ${checks} checks passed.`);
