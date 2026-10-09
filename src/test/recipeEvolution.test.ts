import { describe, expect, it } from 'vitest';
import { splitRecipeSteps, joinRecipeSteps } from '@/lib/recipeSteps';
import { formatRecipeQuantity } from '@/lib/recipeQuantity';
import { recipeStats } from '@/lib/recipeStats';
import type { Recipe } from '@/types/recipe';
describe('Instructions et quantités compatibles', () => {
  it('conserve les retours internes et les ingrédients originaux', () => {
    const steps = splitRecipeSteps('1. Couper les légumes.\nConserver les peaux.\n\n2. Cuire vingt minutes.');
    expect(steps).toEqual(['Couper les légumes.\nConserver les peaux.', 'Cuire vingt minutes.']);
    expect(splitRecipeSteps(joinRecipeSteps(steps))).toEqual(steps);
  });
  it('conserve un ancien paragraphe sans inventer des étapes', () => {
    expect(splitRecipeSteps('Couper.\nPuis cuire.')).toEqual(['Couper.\nPuis cuire.']);
    expect(joinRecipeSteps(['', 'Cuire', ' '])).toBe('1. Cuire');
  });
  it('affiche fidèlement les fractions et ne transforme pas une quantité absente', () => {
    expect(formatRecipeQuantity(0.25)).toBe('0,25');
    expect(formatRecipeQuantity(0.5, 0.25)).toBe('0,125');
    expect(formatRecipeQuantity(0, 2)).toBe('—');
    expect(formatRecipeQuantity(0.0001)).toBe('< 0,001');
  });
});
describe('Compteurs de bibliothèque', () => {
  it('ne compte chaque tag qu’une fois par recette et sépare les auteurs', () => {
    const recipes = [{ id:'1', tags:['Dessert','Dessert','auteur: Annie'] }, { id:'2', tags:['Dessert','Rapide'] }, { id:'3', tags:['auteur: Annie'] }] as Recipe[];
    expect(recipeStats(recipes)).toEqual({ total:3, withoutTag:1, tags:[{tag:'Dessert',count:2},{tag:'Rapide',count:1}], authors:[{tag:'auteur: Annie',count:2}] });
  });
});
