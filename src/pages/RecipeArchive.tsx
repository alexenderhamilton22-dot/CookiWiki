import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { RecipeVersion } from '@/components/RecipeHistory';
export default function RecipeArchive() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from('recipe_versions').select('*').eq('event', 'delete').order('created_at', { ascending: false }).limit(100);
      if (!active) return;
      if (error) { setError('La corbeille n’est pas disponible pour le moment.'); setLoading(false); return; }
      const rows = (data || []) as RecipeVersion[];
      if (rows.length) {
        const current = await supabase.from('recipes').select('id').in('id', rows.map((v) => v.recipe_id));
        if (!active) return;
        if (current.error) { setError('Impossible de vérifier les recettes déjà restaurées.'); setLoading(false); return; }
        const ids = new Set(current.data?.map((r) => r.id));
        const seen = new Set<string>();
        setVersions(rows.filter((v) => { if (ids.has(v.recipe_id) || seen.has(v.recipe_id)) return false; seen.add(v.recipe_id); return true; }));
      } else setVersions([]);
      setLoading(false);
    };
    void load(); return () => { active = false; };
  }, [user]);
  const restore = async (version: RecipeVersion) => {
    if (busy || !window.confirm(`Restaurer « ${version.snapshot.title} » ?`)) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('restore_recipe_version', { version_id: version.id });
    setBusy(false);
    if (error || !data) { toast.error('La restauration a échoué. La recette a peut-être déjà été restaurée ou vos droits ne le permettent pas.'); return; }
    toast.success('Recette restaurée.'); navigate(`/recette/${data}`);
  };
  return <div className="min-h-screen bg-background"><Header /><main className="container max-w-2xl py-6 space-y-4">
    <Button variant="ghost" asChild><Link to="/">← Bibliothèque</Link></Button><h1 className="text-2xl font-semibold">Corbeille</h1>
    {authLoading ? <p>Chargement…</p> : !user ? <p>Connectez-vous pour accéder à la corbeille. <Link className="underline" to="/connexion">Connexion</Link></p> : loading ? <p role="status">Chargement…</p> : error ? <p role="alert">{error} <button className="underline" onClick={() => window.location.reload()}>Réessayer</button></p> : <>
      <p className="text-sm text-muted-foreground">Recettes récupérables parmi les 100 dernières suppressions enregistrées. Les commentaires supprimés avec une recette ne sont pas restaurés.</p>
      {!versions.length && <p>Aucune recette à restaurer.</p>}
      {versions.map((v) => <article key={v.id} className="rounded-xl border bg-card p-4 space-y-2"><h2 className="text-lg font-semibold">{v.snapshot.title}</h2><p className="text-sm">Supprimée le {new Date(v.created_at).toLocaleString('fr-FR')}</p><Button variant="outline" disabled={busy} onClick={() => void restore(v)}>Restaurer</Button></article>)}
    </>}
  </main></div>;
}
