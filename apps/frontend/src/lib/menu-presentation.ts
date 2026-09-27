export interface MenuPresentationItem {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  sort_order?: number | null;
  available?: number | boolean | null;
  out_of_stock?: number | boolean | null;
  hidden?: number | boolean | null;
}

export const PUBLIC_CATEGORY_TABS = [
  { key: 'acai copos da promocao', label: 'Açaí Copos da Promoção' },
  { key: 'acai combos', label: 'Açaí Combos' },
  { key: 'acai monte o seu', label: 'Açaí Monte O Seu' },
  { key: 'vai uma bebida?', label: 'Vai uma Bebida?' },
] as const;

export type PublicCategoryKey = typeof PUBLIC_CATEGORY_TABS[number]['key'];

const RECIPE_ORDER = [
  'x-tradicional', 'x-king pacoca', 'x-splash', 'x-pacoleite', 'x-pacokita',
  'x-chocola', 'x-tropical', 'x-creme', 'x-tella', 'x-king tella',
];

// Presentation summaries from the existing recipes, used only while the received
// description still contains every listed ingredient. The source stays intact.
const RECIPE_INGREDIENTS: Record<string, readonly string[]> = {
  'x-tradicional': ['leite em pó', 'leite condensado', 'granola'],
  'x-king pacoca': ['paçoca', 'leite condensado'],
  'x-splash': ['leite em pó', 'leite condensado'],
  'x-pacoleite': ['leite condensado', 'paçoca', 'leite em pó'],
  'x-pacokita': ['paçoca', 'creme de amendoim', 'leite condensado'],
  'x-chocola': ['leite em pó', 'leite condensado', 'creme de avelã'],
  'x-tropical': ['creme de avelã', 'leite em pó', 'leite condensado', 'morango'],
  'x-creme': ['creme de leitinho', 'creme de morango', 'creme de avelã'],
  'x-tella': ['Nutella', 'leite condensado', 'leite em pó'],
  'x-king tella': ['leite condensado', 'paçoca', 'Nutella'],
};

export function normalizeMenuText(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+\?/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
}

export function publicCategoryKey(value?: string | null): PublicCategoryKey | null {
  const normalized = normalizeMenuText(value);
  return PUBLIC_CATEGORY_TABS.find(tab => tab.key === normalized)?.key || null;
}

export function isMenuItemAvailable(item: Pick<MenuPresentationItem, 'available' | 'out_of_stock' | 'hidden'>) {
  return item.available !== 0 && item.available !== false
    && item.out_of_stock !== 1 && item.out_of_stock !== true
    && item.hidden !== 1 && item.hidden !== true;
}

function isPublicMenuItem(item: MenuPresentationItem) {
  return publicCategoryKey(item.category) !== null
    && item.hidden !== 1 && item.hidden !== true
    && item.id !== 'seed_menu_acai_classico'
    && !/smoke test de staging/i.test(item.description || '');
}

function cupSize(name: string) {
  return Number(normalizeMenuText(name).match(/\b(300|400|500|700)\s*ml\b/)?.[1]) || null;
}

function isDoubleCup(item: Pick<MenuPresentationItem, 'name' | 'category' | 'description'>) {
  const name = normalizeMenuText(item.name);
  return publicCategoryKey(item.category) === 'acai combos'
    && (/\bescolha 2\b|\bdupla\b|\b2\s*(copos|x|×)\b/.test(name)
      || /\b2 copos\b/.test(normalizeMenuText(item.description)));
}

export function getMenuDisplayName(item: Pick<MenuPresentationItem, 'name' | 'category' | 'description'>) {
  const size = cupSize(item.name);
  return isDoubleCup(item) && size
    ? `Dupla X-Açaí — 2 copos de ${size} ml`
    : item.name;
}

function recipeKey(name: string) {
  return normalizeMenuText(name).replace(/^acai\s+/, '');
}

function isMonteCup(item: Pick<MenuPresentationItem, 'name' | 'category'>) {
  return publicCategoryKey(item.category) === 'acai monte o seu'
    && !/marmitex|barca|litrao|roleta/.test(normalizeMenuText(item.name))
    && cupSize(item.name) !== null;
}

function editorialOrder(item: MenuPresentationItem) {
  const category = publicCategoryKey(item.category);
  const name = normalizeMenuText(item.name);
  const size = cupSize(item.name);
  if (category === 'acai copos da promocao') {
    const index = RECIPE_ORDER.indexOf(recipeKey(item.name));
    return index === -1 ? Number.POSITIVE_INFINITY : index;
  }
  if (category === 'acai combos' && isDoubleCup(item) && size) return size;
  if (category === 'acai monte o seu') {
    if (isMonteCup(item) && size) return size;
    if (name.includes('marmitex') && size) return 1000 + size;
    if (/barca\s+p\b/.test(name)) return 2000;
    if (/barca\s+m\b/.test(name)) return 2001;
    if (name.includes('litrao')) return 3000;
    if (name.includes('roleta')) return 4000;
  }
  return Number.POSITIVE_INFINITY;
}

export function sortPublicMenuItems<T extends MenuPresentationItem>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => isPublicMenuItem(item))
    .sort((a, b) => {
      const categoryDifference = PUBLIC_CATEGORY_TABS.findIndex(tab => tab.key === publicCategoryKey(a.item.category))
        - PUBLIC_CATEGORY_TABS.findIndex(tab => tab.key === publicCategoryKey(b.item.category));
      if (categoryDifference !== 0) return categoryDifference;
      const aEditorial = editorialOrder(a.item);
      const bEditorial = editorialOrder(b.item);
      if (aEditorial !== bEditorial) return aEditorial - bEditorial;
      const aOrder = typeof a.item.sort_order === 'number' ? a.item.sort_order : Number.POSITIVE_INFINITY;
      const bOrder = typeof b.item.sort_order === 'number' ? b.item.sort_order : Number.POSITIVE_INFINITY;
      return aOrder !== bOrder ? aOrder - bOrder : a.index - b.index;
    })
    .map(({ item }) => item);
}

export function getMenuCategoryTabs(items: readonly MenuPresentationItem[]) {
  const categories = new Set(items.filter(isPublicMenuItem).map(item => publicCategoryKey(item.category)));
  return PUBLIC_CATEGORY_TABS.filter(tab => categories.has(tab.key));
}

export function getInitialMenuCategory(items: readonly MenuPresentationItem[]): PublicCategoryKey | null {
  const visible = items.filter(isPublicMenuItem);
  return getMenuCategoryTabs(visible.filter(isMenuItemAvailable))[0]?.key
    || getMenuCategoryTabs(visible)[0]?.key || null;
}

export function getEditorialHighlights<T extends MenuPresentationItem>(items: readonly T[]): T[] {
  const eligible = items.filter(item => isPublicMenuItem(item) && isMenuItemAvailable(item));
  const choices = [
    eligible.find(item => publicCategoryKey(item.category) === 'acai copos da promocao' && recipeKey(item.name) === 'x-tradicional'),
    eligible.find(item => isMonteCup(item) && cupSize(item.name) === 500),
    eligible.find(item => isDoubleCup(item) && cupSize(item.name) === 300),
  ];
  return choices.filter((item): item is T => item !== undefined);
}

export function filterMenuItems<T extends MenuPresentationItem>(items: readonly T[], category: string | null, searchTerm: string): T[] {
  const query = normalizeMenuText(searchTerm);
  return items.filter(item => isPublicMenuItem(item) && (query
    ? normalizeMenuText(`${getMenuDisplayName(item)} ${item.name} ${item.description || ''} ${item.category || ''}`).includes(query)
    : !category || publicCategoryKey(item.category) === category));
}

export function getMenuPriceLabel(item: Pick<MenuPresentationItem, 'category'>) {
  const category = publicCategoryKey(item.category);
  if (category === 'acai copos da promocao') return '300 ml · a partir de';
  return category === 'acai combos' ? 'A partir de' : null;
}

export function getMenuCardDescription(item: Pick<MenuPresentationItem, 'name' | 'category' | 'description'>) {
  const description = item.description?.trim() || '';
  if (publicCategoryKey(item.category) !== 'acai copos da promocao') return description;
  const ingredients = RECIPE_INGREDIENTS[recipeKey(item.name)];
  const normalizedDescription = normalizeMenuText(description);
  if (ingredients?.every(ingredient => normalizedDescription.includes(normalizeMenuText(ingredient)))) {
    return `Açaí com ${ingredients.join(', ').replace(/, ([^,]+)$/, ' e $1')}.`;
  }
  return description
    .replace(/^obs\s*:\s*[^.\n]*(?:\.|\n)\s*/i, '')
    .replace(/^este produto não permite[^.\n]*separados\.\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}
