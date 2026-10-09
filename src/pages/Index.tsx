import { useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { usePersonalRecipes } from '@/hooks/usePersonalRecipes';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import RecipeCard from '@/components/RecipeCard';
import RecipeFilters from '@/components/RecipeFilters';
import { useRecipes } from '@/hooks/useRecipes';
import { Loader2, BookOpen } from 'lucide-react';
import type { Recipe } from '@/types/recipe';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const Index = () => {
  const { user } = useAuth();
  const { recipes, loading, error, refetch } = useRecipes();
  const personal = usePersonalRecipes();
  const [scope, setScope] = useState('all');
  const scoped = useMemo(() => {
    if (!user || scope === 'all') return recipes;
    if (scope === 'favorites') return recipes.filter((r) => personal.records.some((p) => p.recipe_id === r.id && p.is_favorite));
    const viewed = new Map(personal.records.filter((p) => p.last_viewed_at).map((p) => [p.recipe_id, p.last_viewed_at!]));
    return recipes.filter((r) => viewed.has(r.id)).sort((a, b) => viewed.get(b.id)!.localeCompare(viewed.get(a.id)!));
  }, [recipes, user, scope, personal.records]);
  const [filtered, setFiltered] = useState<Recipe[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const handleFiltered = useCallback((f: Recipe[]) => setFiltered(f), []);

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = window.confirm('Mettre cette recette dans la corbeille ? Elle pourra être restaurée si l’historique est activé.');
      if (!confirmed) return;

      const { data, error } = await supabase.rpc('trash_recipe', { target_recipe: id });
      if (error || !data) {
        console.error('Erreur Supabase lors de la suppression :', error);
        toast.error('Impossible de mettre la recette dans la corbeille. Elle est conservée.');
        return;
      }
      toast.success('Recette supprimée.');
      await refetch();
      navigate('/');
    },
    [navigate, refetch],
  );

  return (
    <div className="min-h-screen bg-emerald-50">
      <Header />
      <main className="container py-6 space-y-6">
        <section className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-amber-700 shrink-0" />
          <div><h1 className="font-serif text-2xl font-semibold text-amber-700">Le Grimoire de MAMIFA</h1>
          <p className="text-sm text-muted-foreground">Vos recettes à retrouver, cuisiner et partager. <span className="ml-1 inline-block rounded-full border px-2 py-0.5 text-xs whitespace-nowrap" aria-label={`Version ${__COOKIWIKI_VERSION__}`}>v{__COOKIWIKI_VERSION__}</span></p></div>
          {!loading && !error && <span className="ml-auto text-sm font-semibold text-primary whitespace-nowrap">{recipes.length} recettes</span>}
        </section>

        {user && <div className="flex flex-wrap gap-2" aria-label="Bibliothèque personnelle">
          <Button size="sm" variant={scope === 'all' ? 'default' : 'outline'} onClick={() => setScope('all')}>Toutes</Button>
          <Button size="sm" variant={scope === 'favorites' ? 'default' : 'outline'} onClick={() => setScope('favorites')}>Favoris ({personal.records.filter((p) => p.is_favorite && recipes.some((r) => r.id === p.recipe_id)).length})</Button>
          <Button size="sm" variant={scope === 'recent' ? 'default' : 'outline'} onClick={() => setScope('recent')}>Consultées récemment</Button>
          <Button size="sm" variant="ghost" asChild><Link to="/corbeille">Corbeille</Link></Button>
        </div>}
        {user && personal.error && <p role="alert" className="text-sm">{personal.error} <button className="underline" onClick={() => void personal.refresh()}>Réessayer</button></p>}
        <RecipeFilters recipes={scoped} libraryRecipes={recipes} onFiltered={handleFiltered} />

        <div ref={listRef}>
          {error ? <div role="alert" className="text-center py-8">{error}<button className="block mx-auto underline mt-2" onClick={() => void refetch()}>Réessayer</button></div> : loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Aucune recette trouvée.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((r) => (
                <RecipeCard key={r.id} recipe={r} onDelete={user ? handleDelete : undefined} favorite={personal.records.some((p) => p.recipe_id === r.id && p.is_favorite)} onFavorite={user ? () => void personal.toggleFavorite(r.id, !personal.records.some((p) => p.recipe_id === r.id && p.is_favorite)) : undefined} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
