import { describe, it, expect } from 'vitest';
import { getAnalysisFeedback, parseAnalyzedRecipe, RecipeAnalysisError } from '@/lib/recipeAnalysis';
const valid = { ingredients: [{ name: 'Carotte', quantity: 2, unit: 'pièce' }], instructions: ['Faire cuire.'] };
describe('Messages d’analyse IA', () => {
  it.each([
    [{ status: 429, message: 'https://provider.test?key=SECRET' }, 'IA-QUOTA'],
    [{ status: 403 }, 'IA-ACCES'],
    [new Error('API key not valid'), 'IA-ACCES'],
    [{ status: 503 }, 'IA-SERVICE'],
    [new Error('Failed to fetch'), 'IA-RESEAU'],
    [new Error('Request timed out'), 'IA-DELAI'],
    [new Error('[GoogleGenerativeAI Error]: [429 Too Many Requests]'), 'IA-QUOTA'],
    [new Error('SAFETY blocked'), 'IA-BLOCAGE'],
    [{ status: 413 }, 'IA-TAILLE'],
    [{ status: 404 }, 'IA-MODELE'],
    [{ status: 400 }, 'IA-DEMANDE'],
    [new Error('Unexpected SECRET'), 'IA-INCONNU'],
  ])('classe l’erreur sans exposer le message fournisseur (%j)', (err, code) => {
    const result = getAnalysisFeedback(err, 'photo');
    expect(result.reference).toBe(code); expect(JSON.stringify(result)).not.toContain('SECRET'); expect(JSON.stringify(result)).not.toContain('provider.test');
  });
  it('propose une photo lisible quand aucune recette n’est détectée', () => {
    const result = getAnalysisFeedback(new RecipeAnalysisError('NO_RECIPE_FOUND'), 'photo');
    expect(result.title).toContain('Aucune recette'); expect(result.advice).toContain('bien éclairée');
  });
  it('propose de copier le texte pour un lien inaccessible', () => expect(getAnalysisFeedback(new RecipeAnalysisError('NO_RECIPE_FOUND'), 'url').advice).toContain('copiez les ingrédients'));
  it('distingue la configuration absente', () => expect(getAnalysisFeedback(new RecipeAnalysisError('NOT_CONFIGURED'), 'text').reference).toBe('IA-CONFIG'));
  it('distingue la lecture du fichier', () => expect(getAnalysisFeedback(new RecipeAnalysisError('UNREADABLE_FILE'), 'photo').reference).toBe('IA-LECTURE'));
  it('signale un lien invalide', () => expect(getAnalysisFeedback(new RecipeAnalysisError('INVALID_URL'), 'url').reference).toBe('IA-LIEN'));
});
describe('Réponse IA', () => {
  it('accepte un JSON valide entouré de markdown', () => expect(parseAnalyzedRecipe('```json\n' + JSON.stringify(valid) + '\n```')).toEqual(valid));
  it('reconnaît aucune recette indépendamment de la source', () => expect(() => parseAnalyzedRecipe(' NO_RECIPE_FOUND ')).toThrow('NO_RECIPE_FOUND'));
  it('signale un JSON invalide', () => expect(() => parseAnalyzedRecipe('Réponse incompréhensible')).toThrow('INVALID_RESPONSE'));
  it.each([{}, null, [], { ...valid, ingredients: [] }, { ...valid, instructions: '' }, { ...valid, tags: 'dessert' }, { ...valid, ingredients: [{ name: 'Carotte', quantity: -2, unit: 'g' }] }])('refuse une structure inexploitable (%j)', (data) => expect(() => parseAnalyzedRecipe(JSON.stringify(data))).toThrow('INCOMPLETE_RESPONSE'));
});
