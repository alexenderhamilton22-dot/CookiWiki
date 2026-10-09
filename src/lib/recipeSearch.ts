import type { Recipe } from '@/types/recipe';
export const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function filterRecipes(recipes: Recipe[], search: string, maxTime: number | null, tags: string[]) {
  const terms = normalize(search).split(/[\s,]+/).filter(Boolean);
  const excludes = terms.filter((t) => t.startsWith('-') && t.length > 1).map((t) => t.slice(1));
  const includes = terms.filter((t) => !t.startsWith('-'));
  return recipes.filter((r) => {
    if (maxTime !== null && (r.prep_time || 0) + (r.cook_time || 0) > maxTime) return false;
    if (!tags.every((t) => r.tags?.includes(t))) return false;
    const ingredients = (r.ingredients || []).map((i) => normalize(i.name || ''));
    if (excludes.some((t) => ingredients.some((i) => i.includes(t)))) return false;
    const haystack = [normalize(r.title || ''), ...ingredients];
    return includes.every((t) => haystack.some((value) => value.includes(t)));
  });
}
