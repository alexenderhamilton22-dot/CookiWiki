import { useState, useCallback } from 'react';
import Header from '@/components/Header';
import RecipeCard from '@/components/RecipeCard';
import RecipeFilters from '@/components/RecipeFilters';
import { useRecipes } from '@/hooks/useRecipes';
import { Loader2 } from 'lucide-react';
import type { Recipe } from '@/types/recipe';

const Index = () => {
  const { recipes, loading } = useRecipes();
  const [filtered, setFiltered] = useState<Recipe[]>([]);

  const handleFiltered = useCallback((f: Recipe[]) => setFiltered(f), []);

  return (
    <div className="min-h-screen bg-emerald-50">
      <Header />
      <main className="container py-6 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-foreground">CookiWiki</h1>
          <p className="text-muted-foreground">Les recettes de MAMIFA 🍳</p>
        </div>

        <RecipeFilters recipes={recipes} onFiltered={handleFiltered} />

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">Aucune recette trouvée.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
