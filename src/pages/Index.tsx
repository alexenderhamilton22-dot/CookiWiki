import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import RecipeCard from '@/components/RecipeCard';
import RecipeFilters from '@/components/RecipeFilters';
import { useRecipes } from '@/hooks/useRecipes';
import { Loader2, BookOpen } from 'lucide-react';
import type { Recipe } from '@/types/recipe';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const Index = () => {
  const { recipes, loading, refetch } = useRecipes();
  const [filtered, setFiltered] = useState<Recipe[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const handleFiltered = useCallback((f: Recipe[]) => setFiltered(f), []);

  const handleDelete = useCallback(
    async (id: string) => {
      console.log("Tentative de suppression de l'ID :", id);
      const confirmed = window.confirm('Voulez-vous vraiment supprimer cette recette ?');
      if (!confirmed) return;

      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) {
        console.error('Erreur Supabase lors de la suppression :', error);
        toast.error("Impossible de supprimer la recette.");
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
        <section className="space-y-3 rounded-xl border border-amber-100 bg-[#fffdf8] px-4 py-5 shadow-sm sm:px-6">
          <div className="flex items-start gap-3">
            <div className="mt-1 hidden rounded-full bg-amber-100 p-2 text-amber-700 sm:inline-flex">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-[0.18em] uppercase text-amber-700">
                Le Grimoire Numérique de MAMIFA
              </h1>
              <p className="text-sm text-slate-700 leading-relaxed">
                CookiWiki est bien plus qu&apos;une base de données. C&apos;est le sanctuaire des secrets culinaires de MAMIFA,
                où la tradition des vieux grimoires rencontre l&apos;intelligence de demain. Que ce soit une page jaunie
                d&apos;un vieux carnet, un PDF oublié sur un disque dur ou une capture d&apos;écran prise à la volée, notre IA
                s&apos;occupe de tout pour que vous ne gardiez que le meilleur&nbsp;: le plaisir de cuisiner et de partager.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-amber-100 pt-3">
            <span className="text-xs text-muted-foreground">
              Parce que les meilleures recettes ne devraient jamais s&apos;égarer.
            </span>
            {recipes.length === 0 && (
              <button
                type="button"
                onClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="ml-3 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 shadow-sm hover:bg-amber-100"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Ouvrir le Grimoire</span>
              </button>
            )}
          </div>
        </section>

        <RecipeFilters recipes={recipes} onFiltered={handleFiltered} />

        <div ref={listRef}>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Aucune recette trouvée.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((r) => (
                <RecipeCard key={r.id} recipe={r} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
