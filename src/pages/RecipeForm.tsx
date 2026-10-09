import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRecipe } from '@/hooks/useRecipes';
import { supabase } from '@/lib/supabase';
import { analyzeRecipeImage, analyzeRecipeUrl, analyzeRecipeText, type AnalyzedRecipe, type Difficulty } from '@/lib/gemini';
import Header from '@/components/Header';
import RecipeStepsEditor from '@/components/RecipeStepsEditor';
import ImageUpload from '@/components/ImageUpload';
import { getAnalysisFeedback, RecipeAnalysisError, type AnalysisFeedback, type AnalysisSource } from '@/lib/recipeAnalysis';
import { uploadRecipePhoto } from '@/lib/recipePhoto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Plus, X, Trash2, Sparkles, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useRecipeDraft } from '@/hooks/useRecipeDraft';
import { draftFromRecipe, emptyRecipeDraft, recipeDraftKey, type RecipeDraft } from '@/lib/recipeDraft';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Ingredient } from '@/types/recipe';

export default function RecipeForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { recipe, loading: loadingRecipe } = useRecipe(isEdit ? id : undefined);

  const displayName =
    user?.user_metadata?.username ||
    (user?.email ? user.email.split('@')[0] : '') ||
    '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prepTime, setPrepTime] = useState(0);
  const [cookTime, setCookTime] = useState(0);
  const [servings, setServings] = useState(4);
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', qty: 0, unit: 'g' }]);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [hasManualImage, setHasManualImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<AnalysisFeedback | null>(null);
  const reportAnalysisError = (err: unknown, source: AnalysisSource) => {
    const feedback = getAnalysisFeedback(err, source);
    setAnalysisError(feedback);
    toast.error(feedback.title, { description: feedback.advice, duration: 10000 });
  };
  const [importUrl, setImportUrl] = useState('');
  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState<'photo' | 'url' | 'text'>('photo');
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(!isEdit);
  const restoreDraft = useCallback((draft: RecipeDraft) => {
    setTitle(draft.title); setDescription(draft.description); setInstructions(draft.instructions);
    setPrepTime(draft.prepTime); setCookTime(draft.cookTime); setServings(draft.servings);
    setDifficulty(draft.difficulty); setTags(draft.tags); setTagInput(draft.tagInput);
    setImageUrl(draft.imageUrl); setIngredients(draft.ingredients); setHasManualImage(draft.hasManualImage);
    setImportUrl(draft.importUrl); setImportText(draft.importText);
  }, []);
  const draft = useRecipeDraft({
    storageKey: user ? recipeDraftKey(user.id, id) : null,
    data: { title, description, instructions, prepTime, cookTime, servings, difficulty, tags, tagInput, imageUrl, ingredients, hasManualImage, importUrl, importText },
    initial: recipe ? draftFromRecipe(recipe) : emptyRecipeDraft, ready: hydrated && !authLoading && !!user, restore: restoreDraft,
  });

  useEffect(() => {
    if (recipe) {
      restoreDraft(draftFromRecipe(recipe));
      setHydrated(true);
    }
  }, [recipe, restoreDraft]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/connexion');
  }, [user, authLoading, navigate]);

  const addIngredient = () => setIngredients([...ingredients, { name: '', qty: 0, unit: 'g' }]);

  const updateIngredient = (i: number, field: keyof Ingredient, value: string | number) => {
    setIngredients((prev) => prev.map((ing, idx) => idx !== i ? ing : {
      ...ing, name: field === 'name' ? String(value) : ing.name,
      unit: field === 'unit' ? String(value) : ing.unit,
      qty: field === 'qty' ? Number(value) : ing.qty,
    }));
  };

  const removeIngredient = (i: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, idx) => idx !== i));
  };

  const formIsEmpty =
    !title &&
    !description &&
    !instructions &&
    !difficulty &&
    tags.length === 0 &&
    ingredients.every((ing) => !ing.name && !ing.qty);

  const normalizeTags = (incoming?: string[]) => {
    if (!incoming || !Array.isArray(incoming)) return [] as string[];
    const normalized = incoming
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(normalized));
  };

  const ensureAuthorTag = (incomingTags: string[]) => {
    const tagsList = Array.isArray(incomingTags) ? incomingTags : [];
    const hasAuthor = tagsList.some((t) => t.toLowerCase().startsWith('auteur:'));
    if (hasAuthor || !displayName) return tagsList;
    return [...tagsList, `auteur:${displayName}`];
  };

  const normalizeDifficulty = (value?: string | null): Difficulty | undefined => {
    if (!value) return undefined;
    const v = value.toString().trim().toLowerCase();
    if (!v) return undefined;
    if (v === 'facile' || v === 'easy') return 'Facile';
    if (v === 'moyen' || v === 'medium') return 'Moyen';
    if (v === 'difficile' || v === 'hard') return 'Difficile';
    return undefined;
  };

  const handleCameraCaptureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setCameraPreview(String(reader.result));
    reader.readAsDataURL(file);
    setRawFile(file);

    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      const analyzed = await analyzeRecipeImage(file);
      updateForm(analyzed, !formIsEmpty);
      toast.success('Recette extraite depuis la photo !');
    } catch (err) {
      reportAnalysisError(err, 'photo');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateForm = (data: AnalyzedRecipe, merge: boolean) => {
    if (!data) return;
    if (!merge && !formIsEmpty && !window.confirm('Remplacer le contenu saisi par la recette importée ?')) return;

    const rawImageFromIa =
      data.imageUrl && typeof data.imageUrl === 'string'
        ? data.imageUrl
        : data.image_url && typeof data.image_url === 'string'
          ? data.image_url
          : null;

    if (!merge) {
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);

      if (typeof data.prepTimeMinutes === 'number' && !Number.isNaN(data.prepTimeMinutes)) {
        setPrepTime(data.prepTimeMinutes);
      }
      if (typeof data.cookTimeMinutes === 'number' && !Number.isNaN(data.cookTimeMinutes)) {
        setCookTime(data.cookTimeMinutes);
      }
      if (typeof data.servings === 'number' && !Number.isNaN(data.servings) && data.servings > 0) {
        setServings(data.servings);
      }

      const d = normalizeDifficulty(data.difficulty);
      if (d) setDifficulty(d);

      if (!hasManualImage && rawImageFromIa && rawImageFromIa.trim()) {
        setImageUrl(rawImageFromIa.trim());
      }

      if (data.ingredients && Array.isArray(data.ingredients) && data.ingredients.length > 0) {
        setIngredients(
          data.ingredients.map((ing) => ({
            name: ing.name || '',
            qty: typeof ing.quantity === 'number' && !Number.isNaN(ing.quantity) ? ing.quantity : 0,
            unit: ing.unit || '',
          })),
        );
      }

      if (Array.isArray(data.instructions) && data.instructions.length > 0) {
        const formatted = data.instructions
          .map((step, index) => `${index + 1}. ${step}`)
          .join('\n');
        setInstructions(formatted);
      } else if (typeof data.instructions === 'string' && data.instructions.trim()) {
        setInstructions(data.instructions);
      }

      const newTags = normalizeTags(data.tags);
      if (newTags.length) setTags(ensureAuthorTag(newTags));
    } else {
      if (data.title && !title) setTitle(data.title);
      if (data.description && !description) setDescription(data.description);

      if (typeof data.prepTimeMinutes === 'number' && !Number.isNaN(data.prepTimeMinutes) && !prepTime) {
        setPrepTime(data.prepTimeMinutes);
      }
      if (typeof data.cookTimeMinutes === 'number' && !Number.isNaN(data.cookTimeMinutes) && !cookTime) {
        setCookTime(data.cookTimeMinutes);
      }
      if (typeof data.servings === 'number' && !Number.isNaN(data.servings) && data.servings > 0 && !servings) {
        setServings(data.servings);
      }

      const d = normalizeDifficulty(data.difficulty);
      if (d && !difficulty) setDifficulty(d);

      if (!hasManualImage && rawImageFromIa && rawImageFromIa.trim()) {
        setImageUrl(rawImageFromIa.trim());
      }

      if (data.ingredients && Array.isArray(data.ingredients) && data.ingredients.length > 0) {
        const incoming = data.ingredients.map((ing) => ({
          name: ing.name || '',
          qty: typeof ing.quantity === 'number' && !Number.isNaN(ing.quantity) ? ing.quantity : 0,
          unit: ing.unit || '',
        }));

        const combined = [...ingredients, ...incoming];
        const seen = new Set<string>();
        const deduped = combined.filter((ing) => {
          const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}|${ing.qty}`;
          if (!ing.name.trim()) return false;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setIngredients(deduped);
      }

      if (Array.isArray(data.instructions) && data.instructions.length > 0) {
        const extra = data.instructions.join('\n');
        setInstructions((prev) => (prev ? `${prev.trim()}\n\n${extra}` : extra));
      } else if (typeof data.instructions === 'string' && data.instructions.trim()) {
        const extra = data.instructions.trim();
        setInstructions((prev) => (prev ? `${prev.trim()}\n\n${extra}` : extra));
      }

      const incomingTags = normalizeTags(data.tags);
      if (incomingTags.length) {
        setTags((prev) => ensureAuthorTag(Array.from(new Set([...prev, ...incomingTags]))));
      }
    }
  };

  const handlePhotoAnalyze = async (merge: boolean) => {
    if (!rawFile) { reportAnalysisError(new RecipeAnalysisError('MISSING_INPUT'), 'photo'); return; }
    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      const analyzed = await analyzeRecipeImage(rawFile);
      updateForm(analyzed, merge);
      toast.success('Recette pré-remplie grâce à l’IA !');
    } catch (err: unknown) {
      reportAnalysisError(err, 'photo');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUrlImport = async (merge: boolean) => {
    if (!importUrl.trim()) {
      reportAnalysisError(new RecipeAnalysisError('MISSING_INPUT'), 'url');
      return;
    }
    try {
      const url = new URL(importUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      reportAnalysisError(new RecipeAnalysisError('INVALID_URL'), 'url');
      return;
    }
    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      const analyzed = await analyzeRecipeUrl(importUrl.trim());
      updateForm(analyzed, merge);
      toast.success('Recette importée depuis le site !');
    } catch (err: unknown) {
      reportAnalysisError(err, 'url');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextAnalyze = async (merge: boolean) => {
    const trimmed = importText.trim();
    if (!trimmed) {
      reportAnalysisError(new RecipeAnalysisError('MISSING_INPUT'), 'text');
      return;
    }
    if (trimmed.length < 50) {
      reportAnalysisError(new RecipeAnalysisError('NO_RECIPE_FOUND'), 'text');
      return;
    }
    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      const analyzed = await analyzeRecipeText(trimmed);
      updateForm(analyzed, merge);
      toast.success('Texte structuré en recette !');
    } catch (err: unknown) {
      reportAnalysisError(err, 'text');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addTag = () => {
    setTags(normalizeTags([...tags, ...tagInput.split(',')]));
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving || uploadingCover || isAnalyzing) return;
    const validIngredients = ingredients.filter((ing) => ing.name.trim()).map((ing) => ({ ...ing, name: ing.name.trim(), unit: ing.unit.trim() }));
    if (!title.trim() || !instructions.trim() || !validIngredients.length) {
      toast.error('Renseignez un titre, au moins un ingrédient et les instructions.');
      return;
    }
    if (![prepTime, cookTime, servings, ...validIngredients.map((i) => i.qty)].every(Number.isFinite) || servings < 1 || prepTime < 0 || cookTime < 0 || validIngredients.some((i) => i.qty < 0)) {
      toast.error('Vérifiez les temps, les portions et les quantités.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(), description: description.trim() || null, instructions: instructions.trim(),
        prep_time: prepTime, cook_time: cookTime, servings, difficulty: difficulty || null,
        tags: ensureAuthorTag(normalizeTags([...tags, ...tagInput.split(',')])), image_url: imageUrl,
        ingredients: validIngredients, updated_at: new Date().toISOString(), last_modified_by: user.id,
      };
      const query = isEdit
        ? supabase.from('recipes').update(payload).eq('id', id)
        : supabase.from('recipes').insert(payload);
      const { data, error } = await query.select('id').single();
      if (error) throw error;
      if (!data) throw new Error('Aucune recette enregistrée. Vérifiez vos droits.');
      toast.success(isEdit ? 'Recette mise à jour !' : 'Recette créée !');
      draft.markSaved();
      navigate(`/recette/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (err as { message?: string }).message || "Impossible d'enregistrer la recette.");
    } finally {
      setSaving(false);
    }
  };

  async function handlePastedImage(file: File) {
    if (uploadingCover) return;
    setUploadingCover(true);
    try {
      toast.loading('Image collée, traitement en cours...', { id: 'paste-image' });

      const { url } = await uploadRecipePhoto(file);

      setImageUrl(url);
      setHasManualImage(true);

      toast.success('Image collée avec succès !', { id: 'paste-image' });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Impossible d'utiliser l'image du presse-papiers.", { id: 'paste-image' });
    } finally {
      setUploadingCover(false);
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLFormElement>) => {
    const items = Array.from(e.clipboardData.items || []);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    e.preventDefault();
    if (!saving && !isAnalyzing) void handlePastedImage(file);
  };

  if (authLoading || (isEdit && loadingRecipe)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (isEdit && !recipe) return <div className="min-h-screen bg-background"><Header /><main className="container py-10"><p>Recette introuvable ou inaccessible.</p><Button onClick={() => navigate('/')}>Revenir aux recettes</Button></main></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl py-6 pb-24 relative">
        {isAnalyzing && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-xs">
            <div className="flex flex-col items-center gap-3 rounded-full border border-amber-200/70 bg-amber-50/80 px-6 py-4 shadow-xs">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <p className="text-xs sm:text-sm font-serif tracking-[0.18em] uppercase text-amber-700 text-center">
                MAMIFA déchiffre votre recette...
              </p>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Modifier la recette' : 'Nouvelle recette'}</h1>

        {draft.candidate && (
          <section aria-label="Brouillon disponible" className="mb-4 rounded-xl border bg-muted/40 p-4 space-y-3">
            <h2 className="font-semibold">Un brouillon est disponible</h2>
            <p className="text-sm">Enregistré sur cet appareil le {new Date(draft.candidate.savedAt).toLocaleString('fr-FR')}. Choisissez de le reprendre ou de garder la version actuelle avant de continuer la saisie. La photo du document à analyser doit être sélectionnée à nouveau.</p>
            <div className="flex flex-wrap gap-2"><Button type="button" onClick={draft.restoreCandidate}>Reprendre le brouillon</Button><Button type="button" variant="outline" onClick={draft.discardCandidate}>Ignorer le brouillon</Button></div>
          </section>
        )}
        {draft.storageStatus === 'failed' && <p role="status" className="mb-3 text-sm text-destructive">Le brouillon ne peut pas être sauvegardé sur cet appareil. Enregistrez la recette avant de fermer la page.</p>}
        {draft.storageStatus === 'saved' && <p role="status" className="mb-3 text-xs text-muted-foreground">Brouillon sauvegardé sur cet appareil.</p>}
        <Dialog open={draft.blocker.state === 'blocked'} onOpenChange={(open) => { if (!open && draft.blocker.state === 'blocked') draft.blocker.reset(); }}>
          <DialogContent><DialogHeader><DialogTitle>Quitter sans enregistrer la recette ?</DialogTitle><DialogDescription>Vos modifications ne sont pas encore publiées. Vous pouvez revenir à la saisie pour enregistrer la recette.</DialogDescription></DialogHeader>
            <div className="flex flex-wrap gap-2"><Button onClick={() => { if (draft.blocker.state === 'blocked') draft.blocker.reset(); }}>Continuer la saisie</Button><Button variant="outline" onClick={() => { if (draft.blocker.state === 'blocked') draft.blocker.proceed(); }}>Quitter la page</Button></div>
          </DialogContent>
        </Dialog>
        <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-6 relative z-10">
          <fieldset disabled={!!draft.candidate} className="space-y-6 min-w-0">
          <input
            id="camera-capture"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCaptureChange}
          />
          <div className="space-y-2">
            <Label htmlFor="recipe-title">Titre</Label>
            <Input id="recipe-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Tarte aux pommes de Mamie" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipe-description">Description (optionnel)</Label>
            <Input id="recipe-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="La recette secrète de la famille..." />
          </div>

          <section className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="font-semibold">Photo de couverture</h2>
            <p className="text-sm text-muted-foreground">Ajoutez une photo du plat. Elle est indépendante du document utilisé pour importer la recette.</p>
            <ImageUpload currentUrl={imageUrl} onBusyChange={setUploadingCover} onUploaded={(url) => { setImageUrl(url); setHasManualImage(true); }} />
            {imageUrl && <Button type="button" variant="outline" disabled={uploadingCover} onClick={() => { setImageUrl(null); setHasManualImage(true); }}>Retirer la couverture</Button>}
          </section>
          {analysisError && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-2">
              <p className="font-semibold">{analysisError.title}</p>
              <p className="text-sm">{analysisError.advice}</p>
              <p className="text-sm text-muted-foreground">Vos champs déjà saisis sont conservés. Référence : {analysisError.reference}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setAnalysisError(null)}>Fermer le message</Button>
            </div>
          )}
          <details className="rounded-xl border bg-card p-4">
            <summary className="cursor-pointer font-semibold">Importer une recette avec l’IA (facultatif)</summary>
            <p className="text-sm text-muted-foreground my-3">Relisez les ingrédients, quantités et étapes avant d’enregistrer.</p>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'photo' | 'url' | 'text')} className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="photo" className="flex items-center gap-2">
                <span>📸 Photo</span>
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <span>🔗 Lien Web</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <span>✍️ Texte</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photo" className="space-y-2">
              <Label htmlFor="source-photo">Photo du document à analyser</Label>
              <Input id="source-photo" type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) setRawFile(file); }} />
              {rawFile && <p className="text-sm text-muted-foreground">{rawFile.name}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1" asChild disabled={isAnalyzing}>
                  <label htmlFor="camera-capture" className="flex items-center gap-1 cursor-pointer">
                    <Camera className="h-4 w-4" />
                    <span>Prendre une photo</span>
                  </label>
                </Button>
                {cameraPreview && (
                  <div className="inline-flex items-center gap-1 rounded-md bg-muted px-1 py-1 text-xs text-muted-foreground">
                    <img
                      src={cameraPreview}
                      alt="Photo de la recette"
                      className="h-10 w-10 rounded object-cover"
                    />
                    <span className="whitespace-nowrap">Photo capturée</span>
                  </div>
                )}
              </div>

              {(rawFile || importUrl) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formIsEmpty ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => (rawFile ? handlePhotoAnalyze(false) : handleUrlImport(false))}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyse en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Scanner avec l&apos;IA</span>
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => (rawFile ? handlePhotoAnalyze(false) : handleUrlImport(false))}
                        disabled={isAnalyzing}
                      >
                        <Sparkles className="h-4 w-4" />
                      <span>{isAnalyzing ? 'Analyse en cours...' : 'Tout remplacer'}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => (rawFile ? handlePhotoAnalyze(true) : handleUrlImport(true))}
                        disabled={isAnalyzing}
                      >
                        <Sparkles className="h-4 w-4" />
                      <span>{isAnalyzing ? 'Analyse en cours...' : 'Compléter la recette'}</span>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="url" className="space-y-2">
              <Label htmlFor="import-url">Lien de la recette</Label>
              <div className="flex gap-2">
                <Input
                  id="import-url"
                  type="url"
                  placeholder="https://exemple.com/ma-recette..."
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {formIsEmpty ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                        onClick={() => handleUrlImport(false)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analyse en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Importer</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleUrlImport(false)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyse en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Tout remplacer</span>
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleUrlImport(true)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyse en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Compléter la recette</span>
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-2">
              <Label htmlFor="import-text">Texte brut de la recette</Label>
              <div
                className="rounded-md border p-3 bg-background"
              >
                <Textarea
                  id="import-text"
                  rows={5}
                  placeholder="Collez ici une recette copiée d'un site, d'un PDF ou d'une note...&#10;Pour un PDF, copiez son texte puis collez-le ici."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="bg-transparent"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1" asChild disabled={isAnalyzing}>
                    <label htmlFor="camera-capture" className="flex items-center gap-1 cursor-pointer">
                      <Camera className="h-4 w-4" />
                      <span>Prendre une photo</span>
                    </label>
                  </Button>
                {cameraPreview && (
                  <div className="inline-flex items-center gap-1 rounded-md bg-muted px-1 py-1 text-xs text-muted-foreground">
                    <img
                      src={cameraPreview}
                      alt="Photo de la recette"
                      className="h-10 w-10 rounded object-cover"
                    />
                    <span className="whitespace-nowrap">Photo capturée</span>
                  </div>
                )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {formIsEmpty ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleTextAnalyze(false)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analyse en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Analyser</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleTextAnalyze(false)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyse en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Tout remplacer</span>
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleTextAnalyze(true)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyse en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Compléter la recette</span>
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
          </details>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label htmlFor="recipe-prep">Prépa (min)</Label>
              <Input id="recipe-prep" type="number" min={0} value={prepTime} onChange={(e) => setPrepTime(+e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-cook">Cuisson (min)</Label>
              <Input id="recipe-cook" type="number" min={0} value={cookTime} onChange={(e) => setCookTime(+e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-servings">Portions</Label>
              <Input id="recipe-servings" type="number" min={1} value={servings} onChange={(e) => setServings(+e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-difficulty">Difficulté</Label>
              <select id="recipe-difficulty"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={difficulty}
                aria-label="Difficulté"
                onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
              >
                <option value="">Non précisée</option>
                <option value="Facile">Facile</option>
                <option value="Moyen">Moyen</option>
                <option value="Difficile">Difficile</option>
              </select>
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-3">
            <Label>Ingrédients</Label>
            <datalist id="recipe-units">{["g", "kg", "ml", "cl", "l", "pièce", "c.à.s", "c.à.c", "pincée"].map((unit) => <option key={unit} value={unit} />)}</datalist>
            {ingredients.map((ing, i) => (
              <div key={i} className="grid grid-cols-[5rem_5rem_1fr_2.5rem] gap-2 items-center">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  className="w-full" aria-label={`Quantité ingrédient ${i + 1}`}
                  placeholder="Qté"
                  value={ing.qty || ''}
                  onChange={(e) => updateIngredient(i, 'qty', +e.target.value)}
                />
                <Input
                  className="w-full" aria-label={`Unité ingrédient ${i + 1}`} list="recipe-units"
                  placeholder="unité"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                />
                <Input
                  className="col-span-4 row-start-1 sm:col-span-1 sm:row-auto" aria-label={`Nom ingrédient ${i + 1}`}
                  placeholder="Ingrédient"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                />
                <Button type="button" size="icon" variant="ghost" onClick={() => removeIngredient(i)} aria-label={`Supprimer ingrédient ${i + 1}`} disabled={ingredients.length === 1} className="shrink-0">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="gap-1">
              <Plus className="h-3 w-3" /> Ingrédient
            </Button>
          </div>

          <RecipeStepsEditor value={instructions} onChange={setInstructions} />

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="recipe-tags">Tags (optionnel)</Label>
            <div className="flex gap-2">
              <Input id="recipe-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="dessert, été..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>Ajouter</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <button type="button" key={tag} aria-label={`Retirer le tag ${tag}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                    {tag} <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-3xl flex gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur-sm">
          <Button type="button" variant="outline" disabled={saving || uploadingCover} onClick={() => navigate(isEdit ? `/recette/${id}` : '/')}>Annuler</Button>
          <Button type="submit" className="flex-1" disabled={saving || isAnalyzing || uploadingCover}>
            {(saving || isAnalyzing || uploadingCover) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Enregistrer les modifications' : 'Publier la recette'}
          </Button>
          </div>
          </fieldset>
        </form>
      </main>
    </div>
  );
}
