import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRecipe } from '@/hooks/useRecipes';
import { supabase } from '@/lib/supabase';
import { analyzeRecipeImage, analyzeRecipeUrl, analyzeRecipeText, type AnalyzedRecipe, type Difficulty } from '@/lib/gemini';
import Header from '@/components/Header';
import ImageUpload from '@/components/ImageUpload';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Plus, X, Trash2, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { Ingredient } from '@/types/recipe';

// Bibliothèque d'images de secours (placeholders) basées sur les tags
const DEFAULT_IMAGES = {
  vegetarien: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000&auto=format&fit=crop',
  salade: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop',
  dessert: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=1000&auto=format&fit=crop',
  poisson: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=1000&auto=format&fit=crop',
  viande: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000&auto=format&fit=crop',
  boisson: 'https://images.unsplash.com/photo-1544145945-f904253d0c7b?q=80&w=1000&auto=format&fit=crop',
  preparation: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000&auto=format&fit=crop',
  defaut: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=1000&auto=format&fit=crop',
} as const;

// Fonction pour choisir l'image selon les tags
const getPlaceholderImage = (tags: string[] = []) => {
  const t = tags.map((tag) => tag.toLowerCase());
  if (t.includes('dessert') || t.includes('sucré')) return DEFAULT_IMAGES.dessert;
  if (t.includes('poisson')) return DEFAULT_IMAGES.poisson;
  if (t.includes('viande') || t.includes('poulet')) return DEFAULT_IMAGES.viande;
  if (t.includes('salade')) return DEFAULT_IMAGES.salade;
  if (t.includes('végétarien') || t.includes('veggie')) return DEFAULT_IMAGES.vegetarien;
  if (t.includes('boisson') || t.includes('cocktail')) return DEFAULT_IMAGES.boisson;
  if (t.includes('base') || t.includes('pâte')) return DEFAULT_IMAGES.preparation;
  return DEFAULT_IMAGES.defaut;
};

export default function RecipeForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { recipe, loading: loadingRecipe } = useRecipe(isEdit ? id : undefined);

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
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [hasManualImage, setHasManualImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState<'photo' | 'url' | 'text'>('photo');
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [pdfText, setPdfText] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title);
      setDescription(recipe.description || '');
      setInstructions(recipe.instructions);
      setPrepTime(recipe.prep_time);
      setCookTime(recipe.cook_time);
      setServings(recipe.servings);
      setDifficulty(recipe.difficulty || '');
      setTags(recipe.tags || []);
      setImageUrl(recipe.image_url);
      setIngredients(recipe.ingredients?.length ? recipe.ingredients : [{ name: '', qty: 0, unit: 'g' }]);
    }
  }, [recipe]);

  useEffect(() => {
    if (!user) navigate('/connexion');
  }, [user, navigate]);

  const addIngredient = () => setIngredients([...ingredients, { name: '', qty: 0, unit: 'g' }]);

  const updateIngredient = (i: number, field: keyof Ingredient, value: string | number) => {
    const updated = [...ingredients];
    (updated[i] as any)[field] = value;
    setIngredients(updated);
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
    ingredients.every((ing) => !ing.name && !ing.qty && !ing.unit);

  const normalizeTags = (incoming?: string[]) => {
    if (!incoming || !Array.isArray(incoming)) return [] as string[];
    const normalized = incoming
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(normalized));
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

  const handlePdfFile = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Merci de déposer un fichier PDF.');
      return;
    }
    setPdfName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (!text.trim()) {
        toast.error('Impossible de lire le contenu du PDF.');
        return;
      }
      setPdfText(text);
    };
    reader.readAsText(file);
  };

  const updateForm = (data: AnalyzedRecipe, merge: boolean) => {
    if (!data) return;

    const rawImageFromIa =
      (data as any).imageUrl && typeof (data as any).imageUrl === 'string'
        ? (data as any).imageUrl
        : (data as any).image_url && typeof (data as any).image_url === 'string'
          ? (data as any).image_url
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

      const d = normalizeDifficulty((data as any).difficulty);
      if (d) setDifficulty(d);

      if (rawImageFromIa && rawImageFromIa.trim()) {
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
      if (newTags.length) setTags(newTags);
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

      const d = normalizeDifficulty((data as any).difficulty);
      if (d && !difficulty) setDifficulty(d);

      if (rawImageFromIa && rawImageFromIa.trim()) {
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
          const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`;
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
        setTags((prev) => Array.from(new Set([...prev, ...incomingTags])));
      }
    }
  };

  const handlePhotoAnalyze = async (merge: boolean) => {
    if (!rawFile) return;
    setIsAnalyzing(true);
    try {
      const analyzed = await analyzeRecipeImage(rawFile);
      updateForm(analyzed, merge);
      toast.success('Recette pré-remplie grâce à l’IA !');
    } catch (err: any) {
      console.error(err);
      toast.error("Impossible d'analyser l'image avec l'IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUrlImport = async (merge: boolean) => {
    if (!importUrl.trim()) {
      toast.error('Merci de renseigner une URL de recette.');
      return;
    }
    setIsAnalyzing(true);
    try {
      const analyzed = await analyzeRecipeUrl(importUrl.trim());
      updateForm(analyzed, merge);
      toast.success('Recette importée depuis le site !');
    } catch (err: any) {
      console.error(err);
      toast.error("Impossible d'analyser ce lien avec l'IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextAnalyze = async (merge: boolean) => {
    if (!importText.trim()) {
      toast.error('Merci de coller un texte de recette.');
      return;
    }
    setIsAnalyzing(true);
    try {
      const analyzed = await analyzeRecipeText(importText.trim());
      updateForm(analyzed, merge);
      toast.success('Texte structuré en recette !');
    } catch (err: any) {
      console.error(err);
      toast.error("Impossible d'analyser ce texte avec l'IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePdfAnalyze = async (merge: boolean) => {
    if (!pdfText.trim()) {
      toast.error('Merci de déposer ou sélectionner un PDF de recette.');
      return;
    }
    setIsAnalyzing(true);
    try {
      const analyzed = await analyzeRecipeText(pdfText.trim());
      updateForm(analyzed, merge);
      toast.success('PDF analysé et structuré en recette !');
    } catch (err: any) {
      console.error(err);
      toast.error("Impossible d'analyser ce PDF avec l'IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    const basePayload = {
      title,
      description: description || null,
      instructions,
      prep_time: prepTime,
      cook_time: cookTime,
      servings,
      difficulty: difficulty || null,
      tags,
      image_url: imageUrl,
      ingredients: validIngredients,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from('recipes').update({ ...basePayload, last_modified_by: user.id }).eq('id', id));
    } else {
      ({ error } = await supabase.from('recipes').insert({ ...basePayload, last_modified_by: user.id }));
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isEdit ? 'Recette mise à jour !' : 'Recette créée !');
      navigate('/');
    }
    setSaving(false);
  };

  async function handlePastedImage(file: File) {
    try {
      toast.loading('Image collée, traitement en cours...', { id: 'paste-image' });

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
      const url = data.publicUrl;

      setImageUrl(url);
      setRawFile(compressed);
      setHasManualImage(true);

      toast.success('Image collée avec succès !', { id: 'paste-image' });
    } catch (err: any) {
      console.error(err);
      toast.error("Impossible d'utiliser l'image du presse-papiers.", { id: 'paste-image' });
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLFormElement>) => {
    const items = Array.from(e.clipboardData.items || []);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    e.preventDefault();
    void handlePastedImage(file);
  };

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
  }, []);

  if (isEdit && loadingRecipe) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl py-6 relative">
        {isAnalyzing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-full border border-amber-200/70 bg-amber-50/80 px-6 py-4 shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <p className="text-xs sm:text-sm font-serif tracking-[0.18em] uppercase text-amber-700 text-center">
                MAMIFA déchiffre votre recette...
              </p>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Modifier la recette' : 'Nouvelle recette'}</h1>

        <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-6 relative z-10">
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
              <ImageUpload
                currentUrl={imageUrl}
                onUploaded={(url, file) => {
                  setImageUrl(url);
                  setRawFile(file);
                  setHasManualImage(true);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Conseil : Utilisez le mode Panorama pour les recettes sur plusieurs pages.
              </p>

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
                        <span>Tout remplacer</span>
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
                        <span>Compléter la recette</span>
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
                      <Sparkles className="h-4 w-4" />
                      <span>Tout remplacer</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleUrlImport(true)}
                      disabled={isAnalyzing}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Compléter la recette</span>
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-2">
              <Label htmlFor="import-text">Texte brut de la recette</Label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingPdf(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDraggingPdf(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingPdf(false);
                  const file = Array.from(e.dataTransfer.files || []).find(
                    (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
                  );
                  if (file) {
                    handlePdfFile(file);
                  }
                }}
                className={`rounded-md border p-3 transition-colors ${
                  isDraggingPdf ? 'border-dashed border-amber-500 bg-amber-50/60' : 'border-border bg-background'
                }`}
              >
                <Textarea
                  id="import-text"
                  rows={5}
                  placeholder="Collez ici une recette copiée d'un site, d'un PDF ou d'une note...&#10;Vous pouvez aussi glisser-déposer un PDF dans cette zone."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="bg-transparent"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      handlePdfFile(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isAnalyzing}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Importer un PDF</span>
                  </Button>
                  {pdfName && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span className="truncate max-w-[180px]">{pdfName}</span>
                    </span>
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
                      <Sparkles className="h-4 w-4" />
                      <span>Tout remplacer</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleTextAnalyze(true)}
                      disabled={isAnalyzing}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Compléter la recette</span>
                    </Button>
                  </>
                )}
                {pdfText && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handlePdfAnalyze(false)}
                      disabled={isAnalyzing}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Analyser le PDF</span>
                    </Button>
                    {!formIsEmpty && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handlePdfAnalyze(true)}
                        disabled={isAnalyzing}
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Compléter depuis le PDF</span>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {imageUrl && (
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-md border border-border bg-muted">
                <img
                  src={imageUrl || getPlaceholderImage(tags)}
                  alt="Aperçu de la recette"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = getPlaceholderImage(tags);
                  }}
                />
                {user && (
                  <span className="absolute left-0 top-0 rounded-br-md bg-black/65 px-1 py-0.5 text-[9px] font-medium text-amber-50">
                    {(user.user_metadata as any)?.username ||
                      (user.email ? user.email.split('@')[0] : '')}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground break-all">
                Image prête : {imageUrl}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Tarte aux pommes de Mamie" />
          </div>

          <div className="space-y-2">
            <Label>Description (optionnel)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="La recette secrète de la famille..." />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Prépa (min)</Label>
              <Input type="number" min={0} value={prepTime} onChange={(e) => setPrepTime(+e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cuisson (min)</Label>
              <Input type="number" min={0} value={cookTime} onChange={(e) => setCookTime(+e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Portions</Label>
              <Input type="number" min={1} value={servings} onChange={(e) => setServings(+e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Difficulté</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={difficulty}
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
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  className="w-20"
                  placeholder="Qté"
                  value={ing.qty || ''}
                  onChange={(e) => updateIngredient(i, 'qty', +e.target.value)}
                />
                <Input
                  className="w-16"
                  placeholder="unité"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                />
                <Input
                  className="flex-1"
                  placeholder="Ingrédient"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                />
                <Button type="button" size="icon" variant="ghost" onClick={() => removeIngredient(i)} className="shrink-0">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="gap-1">
              <Plus className="h-3 w-3" /> Ingrédient
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              required
              rows={8}
              placeholder="1. Préchauffer le four à 180°C..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
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
                  <Badge key={tag} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                    {tag} <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={saving || isAnalyzing}>
            {(saving || isAnalyzing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Enregistrer les modifications' : 'Publier la recette'}
          </Button>
        </form>
      </main>
    </div>
  );
}
