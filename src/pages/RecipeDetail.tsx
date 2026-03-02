import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Clock, Edit, ChefHat, Loader2, Plus, Eye } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useRecipe } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import IngredientsList from '@/components/IngredientsList';
import CommentSection from '@/components/CommentSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipe, loading } = useRecipe(id);
  const { user } = useAuth();
  const [cookingMode, setCookingMode] = useState(false);
  const [updatingImage, setUpdatingImage] = useState(false);
  const [imageOverride, setImageOverride] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wakeLockRef = useRef<any>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);

  // Wake Lock: keep screen on while viewing recipe
  useEffect(() => {
    const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    setWakeLockSupported(supported);

    const requestWakeLock = async () => {
      if (!supported) return;
      try {
        // @ts-ignore - Wake Lock not in all TS libs
        const wl = await navigator.wakeLock.request('screen');
        wakeLockRef.current = wl;
        setWakeLockActive(true);
        wl.addEventListener?.('release', () => setWakeLockActive(false));
      } catch {
        setWakeLockActive(false);
      }
    };

    const releaseWakeLock = async () => {
      try {
        await wakeLockRef.current?.release?.();
      } catch {
        // ignore
      } finally {
        wakeLockRef.current = null;
        setWakeLockActive(false);
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
      document.removeEventListener('visibilitychange', onVisibility);
      void releaseWakeLock();
    }
  }, []);

  async function handlePastedImage(file: File) {
    if (!recipe || !recipe.id) return;
    setUpdatingImage(true);
    try {
      toast.loading('Mise à jour de la photo...', { id: 'update-photo' });

      const compressed = (await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      })) as File;

      const ext = compressed.type === 'image/png' ? 'png' : 'jpg';
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('recipe-photos').upload(path, compressed);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: dbError } = await supabase
        .from('recipes')
        .update({
          image_url: publicUrl,
          last_modified_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipe.id);

      if (dbError) throw dbError;

      setImageOverride(publicUrl);
      toast.success('La photo a été mise à jour !', { id: 'update-photo' });
    } catch (err) {
      console.error(err);
      toast.error("Échec de la mise à jour de l'image.", { id: 'update-photo' });
    } finally {
      setUpdatingImage(false);
    }
  }

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
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
  }, [recipe?.id, user?.id]);

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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !id) return;
                    setUpdatingImage(true);
                    try {
                      const compressed = (await imageCompression(file, {
                        maxSizeMB: 0.8,
                        maxWidthOrHeight: 1200,
                        useWebWorker: true,
                      })) as File;
                      const ext = compressed.type === 'image/png' ? 'png' : 'jpg';
                      const path = `${crypto.randomUUID()}.${ext}`;
                      const { error: uploadError } = await supabase.storage
                        .from('recipe-photos')
                        .upload(path, compressed);
                      if (uploadError) throw uploadError;

                      const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path);
                      const url = data.publicUrl;

                      const { error: updateError } = await supabase
                        .from('recipes')
                        .update({
                          image_url: url,
                          last_modified_by: user.id,
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', id);

                      if (updateError) throw updateError;

                      setImageOverride(url);
                      toast.success('Image mise à jour !');
                    } catch (err: any) {
                      console.error(err);
                      toast.error("Impossible de mettre à jour l'image.");
                    } finally {
                      setUpdatingImage(false);
                      if (e.target) e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow hover:bg-black/80 transition"
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
          <div
            className={`prose max-w-none whitespace-pre-wrap text-foreground ${
              cookingMode ? 'prose-lg text-xl leading-relaxed' : 'prose-sm'
            }`}
          >
            {recipe.instructions}
          </div>
        </div>

        <hr className="border-border" />
        <CommentSection recipeId={recipe.id} />
      </main>
    </div>
  );
}
