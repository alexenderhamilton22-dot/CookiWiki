import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Recipe } from '@/types/recipe';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRecipes(data as Recipe[]);
    setLoading(false);
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

  return { recipes, loading, refetch: fetchRecipes };
}

export function useRecipe(id: string | undefined) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setRecipe(data as Recipe);
        setLoading(false);
      });
  }, [id]);

  return { recipe, loading };
}
