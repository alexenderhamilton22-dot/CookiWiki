import { useState, useMemo, useEffect } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import type { Recipe } from '@/types/recipe';
import { filterRecipes, normalize } from '@/lib/recipeSearch';
import { recipeStats } from '@/lib/recipeStats';

interface Props { recipes: Recipe[]; libraryRecipes?: Recipe[]; onFiltered: (filtered: Recipe[]) => void; }
export default function RecipeFilters({ recipes, libraryRecipes = recipes, onFiltered }: Props) {
  const stats = useMemo(() => recipeStats(libraryRecipes), [libraryRecipes]);
  const [statsOpen, setStatsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const allTags = useMemo(() => Array.from(new Set(recipes.flatMap((r) => r.tags || []))).sort((a, b) => a.localeCompare(b, 'fr')), [recipes]);
  const filtered = useMemo(() => {
    const result = filterRecipes(recipes, search, maxTime, selectedTags);
    if (sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    if (sort === 'time') result.sort((a, b) => ((a.prep_time || 0) + (a.cook_time || 0)) - ((b.prep_time || 0) + (b.cook_time || 0)));
    return result;
  }, [recipes, search, maxTime, selectedTags, sort]);
  useEffect(() => onFiltered(filtered), [filtered, onFiltered]);
  const toggle = (tag: string) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  const reset = () => { setSearch(''); setMaxTime(null); setSelectedTags([]); setTagSearch(''); };
  return (
    <section className="space-y-3 rounded-xl border bg-card p-3" aria-label="Recherche de recettes">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Rechercher une recette" placeholder="Titre, ingrédients… (ex. poulet -oignon)" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-9" />
          {search && <button type="button" aria-label="Effacer la recherche" onClick={() => setSearch('')} className="absolute right-2 top-2 p-1"><X className="h-4 w-4" /></button>}
        </div>
        <Sheet>
          <SheetTrigger asChild><Button variant="outline" className="gap-2"><SlidersHorizontal className="h-4 w-4" />Tags{selectedTags.length ? ` (${selectedTags.length})` : ''}</Button></SheetTrigger>
          <SheetContent className="flex flex-col">
            <SheetHeader><SheetTitle>Filtrer par tags</SheetTitle><SheetDescription>La recette doit posséder tous les tags sélectionnés.</SheetDescription></SheetHeader>
            <Input aria-label="Rechercher un tag" placeholder="Rechercher un tag ou un auteur…" value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} />
            <div className="flex-1 overflow-y-auto space-y-1 pr-2">
              {allTags.filter((t) => normalize(t).includes(normalize(tagSearch))).map((tag) => (
                <label key={tag} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted cursor-pointer text-sm">
                  <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggle(tag)} className="h-4 w-4" />
                  <span className="flex-1 break-words">{tag}</span>
                  <span className="text-muted-foreground">{recipes.filter((r) => r.tags?.includes(tag)).length}</span>
                </label>
              ))}
              {!allTags.some((t) => normalize(t).includes(normalize(tagSearch))) && <p className="text-sm">Aucun tag trouvé.</p>}
            </div>
            <p role="status" className="text-sm">{filtered.length} recette(s)</p>
            <Button variant="outline" onClick={() => setSelectedTags([])}>Effacer les tags</Button>
          </SheetContent>
        </Sheet>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Sheet open={statsOpen} onOpenChange={setStatsOpen}>
          <SheetTrigger asChild><Button variant="ghost" size="sm">Répartition ({stats.total})</Button></SheetTrigger>
          <SheetContent className="flex flex-col">
            <SheetHeader><SheetTitle>{stats.total} recettes dans la bibliothèque</SheetTitle><SheetDescription>Répartition de toutes les recettes. Une recette peut figurer dans plusieurs tags/catégories.</SheetDescription></SheetHeader>
            <div className="overflow-y-auto flex-1 space-y-4">
              <p className="text-sm">{stats.withoutTag} sans tag/catégorie</p>
              {[{ title: 'Par tag / catégorie', items: stats.tags }, { title: 'Par auteur', items: stats.authors }].map((group) => <section key={group.title} className="space-y-2"><h3 className="font-semibold">{group.title}</h3>{group.items.length === 0 && <p className="text-sm">Aucune information renseignée.</p>}{group.items.map(({ tag, count }) => <div key={tag} className="flex gap-2 justify-between py-2 border-b"><span className="break-words">{tag.replace(/^auteur\s*:/i, '').trim()}</span><strong>{count}</strong></div>)}</section>)}
            </div>
          </SheetContent>
        </Sheet>
        <label htmlFor="max-time">Temps total</label>
        <select id="max-time" className="rounded-md border bg-background p-2" value={maxTime ?? ''} onChange={(e) => setMaxTime(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Tous</option>{[15, 30, 45, 60, 90, 120, 180].map((time) => <option key={time} value={time}>≤ {time} min</option>)}
        </select>
        <label htmlFor="recipe-sort" className="sm:ml-auto">Trier</label>
        <select id="recipe-sort" className="rounded-md border bg-background p-2" value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Plus récentes</option><option value="title">Titre A–Z</option><option value="time">Plus rapides</option></select>
        <span role="status">{filtered.length} / {recipes.length} recette(s)</span>
      </div>
      {selectedTags.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1">{selectedTags.map((tag) => <button type="button" key={tag} aria-label={`Retirer le tag ${tag}`} onClick={() => toggle(tag)} className="flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs">{tag}<X className="h-3 w-3" /></button>)}</div>}
      {(search || maxTime !== null || selectedTags.length > 0) && <Button variant="ghost" size="sm" onClick={reset}>Réinitialiser les filtres</Button>}
    </section>
  );
}
