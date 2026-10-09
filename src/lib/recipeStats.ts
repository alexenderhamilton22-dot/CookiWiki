import type { Recipe } from '@/types/recipe';
export function recipeStats(recipes: Recipe[]) {
  const tags = new Map<string, number>();
  const authors = new Map<string, number>();
  for (const recipe of recipes) {
    for (const tag of new Set((recipe.tags || []).map((t) => t.trim()).filter(Boolean))) {
      const target = /^auteur\s*:/i.test(tag) ? authors : tags;
      target.set(tag, (target.get(tag) || 0) + 1);
    }
  }
  const sorted = (map: Map<string, number>) => [...map].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'fr'));
  return { total: recipes.length, withoutTag: recipes.filter((r) => !(r.tags || []).some((t) => t.trim() && !/^auteur\s*:/i.test(t))).length, tags: sorted(tags), authors: sorted(authors) };
}
