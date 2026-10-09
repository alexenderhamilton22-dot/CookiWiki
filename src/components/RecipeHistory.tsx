import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/button';
import { toast } from 'sonner';
import type { Recipe } from '@/types/recipe';
export interface RecipeVersion { id: string; recipe_id: string; event: 'update' | 'delete'; created_at: string; snapshot: Recipe; }
export default function RecipeHistory({ recipe, onRestored }: { recipe: Recipe; onRestored: () => void }) {
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error } = await supabase.from('recipe_versions').select('*').eq('recipe_id', recipe.id).eq('event', 'update').order('created_at', { ascending: false }).limit(20);
    if (error) setError('L’historique n’est pas disponible pour le moment.');
    else setVersions((data || []) as RecipeVersion[]);
    setLoading(false);
  }, [recipe.id]);
  useEffect(() => { void load(); }, [load]);
  const restore = async (version: RecipeVersion) => {
    if (busy || !window.confirm('Remplacer la recette actuelle par cette version ? La version actuelle sera conservée dans l’historique.')) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('restore_recipe_version', { version_id: version.id, expected_updated_at: recipe.updated_at });
    setBusy(false);
    if (error || !data) { toast.error('Restauration impossible : la recette a peut-être changé ou vos droits ne le permettent pas. Rechargez la fiche puis réessayez.'); return; }
    toast.success('La version a été restaurée.'); onRestored();
  };
  return <section className="space-y-3">
    <h3 className="font-semibold">Versions précédentes</h3>
    {loading ? <p role="status">Chargement…</p> : error ? <p role="alert">{error} <button className="underline" onClick={() => void load()}>Réessayer</button></p> : versions.length === 0 ? <p>Aucune version précédente enregistrée.</p> : <>
      <p className="text-sm text-muted-foreground">Les 20 dernières sauvegardes précédant une modification.</p>
      {versions.map((version) => <details key={version.id} className="rounded-lg border p-3">
        <summary className="cursor-pointer">{new Date(version.created_at).toLocaleString('fr-FR')} — {version.snapshot.title}</summary>
        <p className="mt-2 text-sm whitespace-pre-wrap">{version.snapshot.instructions}</p>
        <ul className="my-2 text-sm">{version.snapshot.ingredients?.map((i, n) => <li key={n}>{i.qty} {i.unit} {i.name}</li>)}</ul>
        <Button variant="outline" disabled={busy} onClick={() => void restore(version)}>Restaurer cette version</Button>
      </details>)}
    </>}
  </section>;
}
