import { z } from 'zod';
import type { Ingredient, Recipe } from '../types/recipe';
const draftSchema = z.object({
  title: z.string(), description: z.string(), instructions: z.string(),
  prepTime: z.number().finite().nonnegative(), cookTime: z.number().finite().nonnegative(), servings: z.number().finite().positive(),
  difficulty: z.enum(['', 'Facile', 'Moyen', 'Difficile']), tags: z.array(z.string()), tagInput: z.string(),
  imageUrl: z.string().nullable(), ingredients: z.array(z.object({ name: z.string(), qty: z.number().finite().nonnegative(), unit: z.string() })).min(1),
  hasManualImage: z.boolean(), importUrl: z.string(), importText: z.string(),
});
export interface RecipeDraft {
  title: string; description: string; instructions: string; prepTime: number; cookTime: number; servings: number;
  difficulty: '' | 'Facile' | 'Moyen' | 'Difficile'; tags: string[]; tagInput: string;
  imageUrl: string | null; ingredients: Ingredient[]; hasManualImage: boolean; importUrl: string; importText: string;
}
export const emptyRecipeDraft: RecipeDraft = {
  title: '', description: '', instructions: '', prepTime: 0, cookTime: 0, servings: 4, difficulty: '', tags: [], tagInput: '', imageUrl: null,
  ingredients: [{ name: '', qty: 0, unit: 'g' }], hasManualImage: false, importUrl: '', importText: '',
};
export const recipeDraftKey = (userId: string, recipeId?: string) => `cookiwiki:draft:v1:${userId}:${recipeId || 'new'}`;
export function draftFromRecipe(recipe: Recipe): RecipeDraft {
  return { ...emptyRecipeDraft, title: recipe.title, description: recipe.description || '', instructions: recipe.instructions,
    prepTime: recipe.prep_time || 0, cookTime: recipe.cook_time || 0, servings: recipe.servings || 4,
    difficulty: recipe.difficulty || '', tags: recipe.tags || [], imageUrl: recipe.image_url || null,
    ingredients: recipe.ingredients?.length ? recipe.ingredients : emptyRecipeDraft.ingredients, hasManualImage: !!recipe.image_url };
}
const MAX_AGE = 14 * 24 * 60 * 60 * 1000;
export function readRecipeDraft(storage: Storage, key: string, now = Date.now()): { data: RecipeDraft; savedAt: number } | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  if (raw.length > 500000) { storage.removeItem(key); return null; }
  let envelope: unknown;
  try { envelope = JSON.parse(raw); } catch { storage.removeItem(key); return null; }
  const schema = z.object({ version: z.literal(1), savedAt: z.number().finite(), data: draftSchema });
  const parsed = schema.safeParse(envelope);
  if (!parsed.success || now - parsed.data.savedAt > MAX_AGE || parsed.data.savedAt > now + 60000) { storage.removeItem(key); return null; }
  return { data: parsed.data.data as RecipeDraft, savedAt: parsed.data.savedAt };
}
export function writeRecipeDraft(storage: Storage, key: string, data: RecipeDraft, now = Date.now()) {
  const normalized = draftSchema.parse(data);
  const value = JSON.stringify({ version: 1, savedAt: now, data: normalized });
  if (value.length > 500000) throw new Error('Draft too large');
  storage.setItem(key, value);
}
