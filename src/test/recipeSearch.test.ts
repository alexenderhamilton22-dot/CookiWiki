import { describe, it, expect } from 'vitest';
import { filterRecipes } from '@/lib/recipeSearch';
import type { Recipe } from '@/types/recipe';
const recipes = [
  { id: '1', title: 'Poulet au citron', ingredients: [{ name: 'Citron' }, { name: 'Poulet' }], prep_time: 10, cook_time: 20, tags: ['rapide', 'viande'] },
  { id: '2', title: 'Soupe', ingredients: [{ name: 'Oignon' }, { name: 'Crème' }], prep_time: 20, cook_time: 15, tags: ['végétarien'] },
  { id: '3', title: 'Mijoté', ingredients: [], prep_time: 20, cook_time: 200, tags: ['viande'] },
] as Recipe[];
describe('Recherche de recettes', () => {
  it('affiche aussi les recettes longues sans filtre', () => expect(filterRecipes(recipes, '', null, [])).toHaveLength(3));
  it('exige tous les mots', () => expect(filterRecipes(recipes, 'poulet oignon', null, [])).toHaveLength(0));
  it('accepte les virgules entre ingrédients', () => expect(filterRecipes(recipes, 'poulet, citron', null, []).map((r) => r.id)).toEqual(['1']));
  it('combine titre et ingrédient', () => expect(filterRecipes(recipes, 'poulet citron', null, []).map((r) => r.id)).toEqual(['1']));
  it('ignore accents et casse', () => expect(filterRecipes(recipes, 'CREME', null, []).map((r) => r.id)).toEqual(['2']));
  it('exclut un ingrédient', () => expect(filterRecipes(recipes, '-oignon', null, []).map((r) => r.id)).toEqual(['1', '3']));
  it('combine durée et tags', () => expect(filterRecipes(recipes, '', 30, ['viande', 'rapide']).map((r) => r.id)).toEqual(['1']));
  it('supporte les ingrédients et tags absents', () => expect(filterRecipes([{ title: 'Pain' } as Recipe], 'pain', null, [])).toHaveLength(1));
});
