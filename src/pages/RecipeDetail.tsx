import { useParams, useNavigate } from 'react-router-dom';
import { useRecipe } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import IngredientsList from '@/components/IngredientsList';
import CommentSection from '@/components/CommentSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Edit, ChefHat, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipe, loading } = useRecipe(id);
  const { user } = useAuth();
  const [cookingMode, setCookingMode] = useState(false);

  // Wake Lock for cooking mode
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if (cookingMode && 'wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then((wl) => { wakeLock = wl; }).catch(() => {});
    }
    return () => { wakeLock?.release(); };
  }, [cookingMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <p className="text-center py-20 text-muted-foreground">Recette introuvable.</p>
      </div>
    );
  }

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <div className={`min-h-screen ${cookingMode ? 'bg-card' : 'bg-background'}`}>
      <Header />
      <main className="container max-w-2xl py-6 space-y-6">
        {recipe.image_url && (
          <img src={recipe.image_url} alt={recipe.title} className="w-full aspect-video object-cover rounded-lg" />
        )}

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-bold leading-tight">{recipe.title}</h1>
            {user && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/recette/${id}/modifier`)}>
                <Edit className="h-4 w-4 mr-1" /> Modifier
              </Button>
            )}
          </div>

          {recipe.description && <p className="text-muted-foreground">{recipe.description}</p>}

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {recipe.prep_time > 0 && <span>🧑‍🍳 Prépa {recipe.prep_time} min</span>}
            {recipe.cook_time > 0 && <span>🔥 Cuisson {recipe.cook_time} min</span>}
            {totalTime > 0 && (
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Total {totalTime} min</span>
            )}
          </div>

          {recipe.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="bg-sage-light text-primary border-primary/20">{tag}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            variant={cookingMode ? 'secondary' : 'outline'}
            onClick={() => setCookingMode(!cookingMode)}
            className="gap-1"
          >
            <ChefHat className="h-4 w-4" />
            {cookingMode ? 'Mode normal' : 'Mode cuisine'}
          </Button>
        </div>

        <IngredientsList ingredients={recipe.ingredients || []} baseServings={recipe.servings || 4} />

        <div className="space-y-3">
          <h3 className="font-serif text-lg font-semibold">Instructions</h3>
          <div className={`prose prose-sm max-w-none whitespace-pre-wrap text-foreground ${cookingMode ? 'text-lg leading-relaxed' : ''}`}>
            {recipe.instructions}
          </div>
        </div>

        <hr className="border-border" />
        <CommentSection recipeId={recipe.id} />
      </main>
    </div>
  );
}
