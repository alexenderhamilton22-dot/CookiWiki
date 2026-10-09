import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Recipe } from '@/types/recipe';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // PostgREST limits each response; do not display a truncated library count.
      const all: Recipe[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error: dbError } = await supabase.from('recipes').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
        if (dbError) throw dbError;
        all.push(...((data || []) as Recipe[]));
        if (!data || data.length < 500) break;
      }
      setRecipes([...new Map(all.map((r) => [r.id, r])).values()]);
    } catch {
      setError('Impossible de charger les recettes. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  useEffect(() => {
    // Refresh automatically when recipes change (tags update, etc.)
    const channel = supabase
      .channel('recipes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recipes' },
        () => {
          fetchRecipes();
        },
      )
      .subscribe();

    // Fallback: refresh when user returns to the tab
    const onFocus = () => fetchRecipes();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchRecipes();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchRecipes]);

  return { recipes, loading, error, refetch: fetchRecipes };
}

export function useRecipe(id: string | undefined) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRecipe(null);
    if (!id) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setRecipe(data as Recipe);
        setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  return { recipe, loading };
}
