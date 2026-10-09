import { beforeEach, describe, it, expect } from 'vitest';
import { readRecipeDraft, writeRecipeDraft, emptyRecipeDraft, recipeDraftKey } from '@/lib/recipeDraft';
beforeEach(() => localStorage.clear());
describe('Brouillons', () => {
  it('isole utilisateur et recette', () => {
    writeRecipeDraft(localStorage, recipeDraftKey('u1','r1'), { ...emptyRecipeDraft, title:'Soupe' });
    expect(readRecipeDraft(localStorage, recipeDraftKey('u2','r1'))).toBeNull();
    expect(readRecipeDraft(localStorage, recipeDraftKey('u1','r2'))).toBeNull();
    expect(readRecipeDraft(localStorage, recipeDraftKey('u1','r1'))?.data.title).toBe('Soupe');
  });
  it('restaure les ingrédients, la couverture et le texte d’import', () => {
    const data = { ...emptyRecipeDraft, ingredients: [{ name:'Carotte',qty:1.5,unit:'kg' }], imageUrl:'https://example.test/photo.jpg', importText:'Recette copiée' };
    writeRecipeDraft(localStorage,'key',data); expect(readRecipeDraft(localStorage,'key')?.data).toEqual(data);
  });
  it('ignore un brouillon corrompu', () => { localStorage.setItem('key','not-json'); expect(readRecipeDraft(localStorage,'key')).toBeNull(); expect(localStorage.getItem('key')).toBeNull(); });
  it('ignore les champs invalides', () => { localStorage.setItem('key',JSON.stringify({version:1,savedAt:Date.now(),data:{title:'Incomplete'}})); expect(readRecipeDraft(localStorage,'key')).toBeNull(); });
  it('expire après 14 jours', () => { writeRecipeDraft(localStorage,'key',emptyRecipeDraft,1); expect(readRecipeDraft(localStorage,'key',15*86400000)).toBeNull(); });
});
