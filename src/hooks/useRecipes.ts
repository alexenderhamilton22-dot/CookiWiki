import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Recipe } from '@/types/recipe';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRecipes(data as Recipe[]);
    setLoading(false);
  };

  useEffect(() => { fetchRecipes(); }, []);

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
