// Regressão do cadastro e dos controles React, sem servidor, pedido ou pagamento.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'apps/frontend');
const appRequire = createRequire(path.join(frontend, 'package.json'));
const ts = appRequire('typescript');

function loadSource(relativePath, suffix = '', mocks = {}) {
    const code = ts.transpileModule(fs.readFileSync(path.join(frontend, relativePath), 'utf8') + suffix, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : appRequire(name), module, module.exports);
    return module.exports;
}

const { buildPromotionOptionGroups } = loadSource('src/lib/promotion-options.ts');
const { GroupSelector, buildFallbackOptionGroups } = loadSource('src/app/product/[id]/page.tsx', '\nexport { GroupSelector, buildFallbackOptionGroups };', {
    'next/navigation': {},
    '../../../components/CartContext': {},
    '../../../hooks/useTenant': {},
    '../../../lib/promotion-options': { buildPromotionOptionGroups },
});
const menu = JSON.parse(fs.readFileSync(path.join(frontend, 'public/default-menu.json'), 'utf8'));
const source = JSON.parse(fs.readFileSync(path.join(root, 'apps/backend/ifood-normalized-augmented.json'), 'utf8'));
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const cups = menu.filter(item => normalize(item.category).includes('promocao') && !item.id.startsWith('seed_'));

function nodes(tree) {
    if (!tree || typeof tree !== 'object') return [];
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    return [tree, ...nodes(tree.props?.children)];
}

test('todos os dez copos carregam os quatro grupos, preços e limites do cadastro conferido no vídeo', () => {
    assert.equal(cups.length, 10);
    const ids = new Set();
    for (const cup of cups) {
        const expected = source.find(item => normalize(item.name) === normalize(cup.name));
        assert.ok(expected, cup.name);
        const groups = buildFallbackOptionGroups(cup);
        assert.deepEqual(groups.map(g => g.name), ['Tamanho do Copo', 'Turbinando o Açaí', 'Vai uma Bebida?', 'Colher']);
        assert.equal(cup.price_cents, expected.price_cents);
        groups.forEach((group, index) => {
            const original = expected.option_groups[index];
            assert.equal(group.required, Number(original.required));
            assert.equal(group.min_select, original.min_select);
            assert.equal(group.max_select, original.max_select);
            assert.deepEqual(group.options.map(o => o.price_cents), original.options.map(o => o.price_cents));
            assert.ok(!ids.has(group.id));
            ids.add(group.id);
            group.options.forEach(option => {
                assert.ok(!ids.has(option.id));
                ids.add(option.id);
            });
        });
    }
});

test('um tamanho ou colher já escolhido pode ser trocado, sem somar duas opções', () => {
    const groups = buildFallbackOptionGroups(cups[0]);
    for (const group of groups.filter(g => g.max_select === 1)) {
        let selection = [group.options[0].id];
        const render = () => nodes(GroupSelector({ group, selected: selection, onChange: next => { selection = next; } }));
        let radios = render().filter(n => n.props?.role === 'radio');
        assert.ok(radios.every(n => !n.props.disabled));
        radios.at(-1).props.onClick();
        assert.deepEqual(selection, [group.options.at(-1).id]);
        radios = render().filter(n => n.props?.role === 'radio');
        assert.equal(radios.filter(n => n.props['aria-checked']).length, 1);
        radios[0].props.onClick();
        assert.deepEqual(selection, [group.options[0].id]);
    }
});

test('adicionais aceitam repetição até o limite e voltam a liberar após remover', () => {
    const group = buildFallbackOptionGroups(cups[0])[1];
    let selection = [];
    const buttons = () => nodes(GroupSelector({ group, selected: selection, onChange: next => { selection = next; } })).filter(n => n.type === 'button');
    const increase = () => buttons().find(n => n.props['aria-label'] === 'Aumentar Creme De Avelã');
    for (let index = 0; index < 5; index++) increase().props.onClick();
    assert.equal(selection.length, 5);
    assert.equal(increase().props.disabled, true);
    buttons().find(n => n.props['aria-label'] === 'Diminuir Creme De Avelã').props.onClick();
    assert.equal(selection.length, 4);
    assert.equal(increase().props.disabled, false);
});

test('700ml do King Paçoca + avelã + Coca = R$59,90, mantendo a diferença para Splash', () => {
    const cup = cups.find(item => item.name === 'Açaí X-King Paçoca');
    const groups = buildFallbackOptionGroups(cup);
    const total = cup.price_cents + groups[0].options[3].price_cents + groups[1].options[1].price_cents + groups[2].options[2].price_cents;
    assert.equal(total, 5990);
    assert.equal(total * 2, 11980);
    const splash = cups.find(item => item.name === 'Açaí X-Splash');
    assert.equal(buildFallbackOptionGroups(splash)[0].options[3].price_cents, 1500);
    assert.deepEqual(buildPromotionOptionGroups({ id: 'new', name: 'Produto sem cadastro', category: 'Açaí Copos da Promoção' }), []);
});

test('não aplica tamanhos promocionais nas bebidas, combos nem Monte o Seu', () => {
    for (const item of menu.filter(item => !normalize(item.category).includes('promocao'))) {
        assert.deepEqual(buildPromotionOptionGroups(item), []);
    }
    for (const item of menu.filter(item => /Barca P|Barca M|Litrão|Roleta/.test(item.name))) {
        const count = item.name.includes('Barca M') ? 7 : 6;
        assert.equal(buildFallbackOptionGroups(item).find(group => group.name.startsWith('Complementos')).max_select, count);
    }
});

test('tela impede adicionar sem tamanho/colher e envia tamanho, adicional e bebida para a sacola', () => {
    const React = appRequire('react');
    const { renderToStaticMarkup } = appRequire('react-dom/server');
    const cup = cups.find(item => item.name === 'Açaí X-King Paçoca');
    const product = { ...cup, option_groups: buildFallbackOptionGroups(cup) };
    const groups = product.option_groups;
    let selections = {};
    let cartItem;
    const { default: ProductPage } = loadSource('src/app/product/[id]/page.tsx', '', {
        react: {
            ...React,
            use: () => ({ id: cup.id }),
            useEffect: () => {},
            useMemo: compute => compute(),
            useState: initial => [initial === null ? product : initial === true ? false : typeof initial === 'object' ? selections : initial, () => {}],
        },
        'next/navigation': { useRouter: () => ({ push: () => {}, back: () => {} }) },
        '../../../components/CartContext': {
            useCart: () => ({ addToCart: item => { cartItem = item; } }),
            buildCartKey: loadSource('src/components/CartContext.tsx').buildCartKey,
        },
        '../../../hooks/useTenant': { useTenant: () => ({ slug: 'default', ready: true }), getApiBase: () => '' },
        '../../../lib/promotion-options': { buildPromotionOptionGroups },
    });
    const render = () => ProductPage({ params: Promise.resolve({ id: cup.id }) });
    const addButton = tree => nodes(tree).find(node => node.props?.id === 'add-to-cart-btn');
    let tree = render();
    assert.equal(addButton(tree).props.disabled, true);
    const html = renderToStaticMarkup(tree);
    for (const name of ['Copo de 300ml', 'Copo de 400ml', 'Copo de 500ml', 'Copo de 700ml', 'Turbinando o Açaí', 'Vai uma Bebida?', 'Colher']) {
        assert.ok(html.includes(name), name);
    }
    selections = {
        [groups[0].id]: [groups[0].options[3].id],
        [groups[1].id]: [groups[1].options[1].id],
        [groups[2].id]: [groups[2].options[2].id],
        [groups[3].id]: [groups[3].options[0].id],
    };
    tree = render();
    assert.equal(addButton(tree).props.disabled, false);
    addButton(tree).props.onClick();
    assert.equal(cartItem.price_cents, 5990);
    assert.equal(cartItem.base_price_cents, 2690);
    assert.equal(cartItem.qty, 1);
    assert.deepEqual(cartItem.selected_options.map(o => o.optionName), ['Copo de 700ml', 'Creme De Avelã', 'Coca-Cola 350ml', 'Sim']);
    assert.ok(cartItem.cartKey.includes(groups[0].options[3].id));
});
