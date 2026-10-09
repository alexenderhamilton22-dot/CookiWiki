import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { usePersonalRecipes } from '@/hooks/usePersonalRecipes';
import { Clock, Edit, ChefHat, Loader2, Plus, Eye } from 'lucide-react';
import { uploadRecipePhoto } from '@/lib/recipePhoto';
import { useRecipe } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import RecipeInstructions from '@/components/RecipeInstructions';
import IngredientsList from '@/components/IngredientsList';
import CommentSection from '@/components/CommentSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
const RecipeHistory = lazy(() => import('@/components/RecipeHistory'));

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipe, loading } = useRecipe(id);
  const { user } = useAuth();
  const personal = usePersonalRecipes();
  const { recordView } = personal;
  const [historyOpen, setHistoryOpen] = useState(false);
  useEffect(() => { if (recipe?.id) void recordView(recipe.id); }, [recipe?.id, recordView]);
  const [cookingMode, setCookingMode] = useState(false);
  const [updatingImage, setUpdatingImage] = useState(false);
  const [imageOverride, setImageOverride] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);

  // Wake Lock: keep screen on while viewing recipe
  useEffect(() => {
    let active = true;
    let pending = false;
    const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    setWakeLockSupported(supported);

    const requestWakeLock = async () => {
      if (!supported || pending || document.visibilityState !== 'visible' || wakeLockRef.current && !wakeLockRef.current.released) return;
      pending = true;
      try {
        const wl = await navigator.wakeLock.request('screen');
        if (!active || document.visibilityState !== 'visible') { await wl.release(); return; }
        wakeLockRef.current = wl;
        setWakeLockActive(true);
        wl.addEventListener?.('release', () => { if (active && wakeLockRef.current === wl) { wakeLockRef.current = null; setWakeLockActive(false); } });
      } catch {
        if (active) setWakeLockActive(false);
      } finally { pending = false; }
    };

    const releaseWakeLock = async () => {
      const lock = wakeLockRef.current;
      wakeLockRef.current = null;
      try {
        await lock?.release?.();
      } catch {
        // ignore
      } finally {
        if (active) setWakeLockActive(false);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      } else {
        void releaseWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibility);
      void releaseWakeLock();
    }
  }, []);

  const handlePastedImage = useCallback(async (file: File) => {
    if (!recipe || !recipe.id || !user || updatingImage) return;
    setUpdatingImage(true);
    try {
      toast.loading('Mise à jour de la photo...', { id: 'update-photo' });

      const { url: publicUrl } = await uploadRecipePhoto(file);

      const { data: saved, error: dbError } = await supabase
        .from('recipes')
        .update({
          image_url: publicUrl,
          last_modified_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipe.id).select('id').single();

      if (dbError) throw dbError;
      if (!saved) throw new Error('La recette n’a pas été modifiée.');

      setImageOverride(publicUrl);
      toast.success('La photo a été mise à jour !', { id: 'update-photo' });
    } catch (err) {
      console.error(err);
      toast.error("Échec de la mise à jour de l'image.", { id: 'update-photo' });
    } finally {
      setUpdatingImage(false);
    }
  }, [recipe, user, updatingImage]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (!user || updatingImage) return;
      const target = event.target as HTMLElement;
      if (target.closest('textarea, input, [contenteditable="true"]')) return;
      const items = Array.from(event.clipboardData?.items || []);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      event.preventDefault();
      void handlePastedImage(file);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handlePastedImage, user, updatingImage]);

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
  const authorTag = recipe.tags?.find((t) => t.toLowerCase().startsWith('auteur:'));
  const authorName = authorTag ? authorTag.split(':').slice(1).join(':').trim() : '';

  return (
    <div className={`min-h-screen ${cookingMode ? 'bg-card' : 'bg-background'}`}>
      <Header />
      <main className="container max-w-2xl py-6 space-y-6">
        {user && <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handlePastedImage(file); e.target.value = ''; }} />}
        {user && !imageOverride && !recipe.image_url && <Button variant="outline" disabled={updatingImage} onClick={() => fileInputRef.current?.click()}>Ajouter une photo de couverture</Button>}
        {wakeLockSupported && (
          <div className="flex justify-end">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                wakeLockActive
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              {wakeLockActive ? 'Écran actif' : 'Écran inactif'}
            </span>
          </div>
        )}
        {(imageOverride || recipe.image_url) && (
          <div className="relative w-full">
            <img
              src={imageOverride || recipe.image_url || ''}
              alt={recipe.title}
              className="w-full aspect-video object-cover rounded-lg"
            />
            {authorName && (
              <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-amber-50">
                {authorName}
              </span>
            )}
            {user && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-sm hover:bg-black/80 transition"
                  aria-label="Changer l'image"
                  disabled={updatingImage}
                >
                  {updatingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
              </>
            )}
          </div>
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
          {user && <Button variant="ghost" aria-pressed={personal.records.some((p) => p.recipe_id === recipe.id && p.is_favorite)} onClick={() => void personal.toggleFavorite(recipe.id, !personal.records.some((p) => p.recipe_id === recipe.id && p.is_favorite))}>{personal.records.some((p) => p.recipe_id === recipe.id && p.is_favorite) ? '♥ Favori' : '♡ Ajouter aux favoris'}</Button>}
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

        <IngredientsList key={recipe.id} ingredients={recipe.ingredients || []} baseServings={recipe.servings || 4} />

        <RecipeInstructions key={`${recipe.id}:${recipe.updated_at}`} instructions={recipe.instructions} cookingMode={cookingMode} />

        <hr className="border-border" />
        {user && !cookingMode && <section className="space-y-3"><Button variant="ghost" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}>Historique des modifications</Button>{historyOpen && <Suspense fallback={<p>Chargement…</p>}><RecipeHistory key={recipe.id} recipe={recipe} onRestored={() => window.location.reload()} /></Suspense>}</section>}
        <CommentSection recipeId={recipe.id} />
      </main>
    </div>
  );
}
