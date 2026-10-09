import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
export interface PersonalRecipe { recipe_id: string; is_favorite: boolean; last_viewed_at: string | null; }
const EMPTY: PersonalRecipe[] = [];
export function usePersonalRecipes() {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<{ owner?: string; records: PersonalRecipe[]; error: string }>({ records: [], error: '' });
  const currentUser = useRef(userId); currentUser.current = userId;
  const busy = useRef(new Set<string>());
  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.from('recipe_bookmarks').select('recipe_id,is_favorite,last_viewed_at').eq('user_id', userId);
      if (error) throw error;
      if (currentUser.current !== userId) return;
      setState({ owner: userId, records: (data || []) as PersonalRecipe[], error: '' });
    } catch {
      if (currentUser.current === userId) setState((previous) => ({ owner: userId, records: previous.owner === userId ? previous.records : EMPTY, error: 'Vos favoris et recettes récentes ne sont pas disponibles pour le moment.' }));
    }
  }, [userId]);
  useEffect(() => { void refresh(); }, [refresh]);
  const toggleFavorite = useCallback(async (recipeId: string, favorite: boolean) => {
    if (!userId) { toast.error('Connectez-vous pour conserver vos favoris.'); return; }
    const key = `${userId}:${recipeId}`;
    if (busy.current.has(key)) return;
    busy.current.add(key);
    try {
      const { error } = await supabase.rpc('set_recipe_favorite', { target_recipe: recipeId, favorite });
      if (error) throw error;
      if (currentUser.current !== userId) return;
      await refresh();
      toast.success(favorite ? 'Recette ajoutée aux favoris.' : 'Recette retirée des favoris.');
    } catch { toast.error('Le favori n’a pas pu être enregistré. Réessayez.'); }
    finally { busy.current.delete(key); }
  }, [userId, refresh]);
  const recordView = useCallback(async (recipeId: string) => {
    if (!userId) return;
    try { await supabase.rpc('record_recipe_view', { target_recipe: recipeId }); } catch { /* Reading a recipe stays available. */ }
  }, [userId]);
  return { records: state.owner === userId ? state.records : EMPTY, error: state.owner === userId ? state.error : '', refresh, toggleFavorite, recordView };
}
