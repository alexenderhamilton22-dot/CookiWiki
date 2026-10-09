// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { performAnalysis, validatePhoto } from './analyze';
const recipe = { title: 'Soupe', ingredients: [{ name: 'Carotte', quantity: 2, unit: 'pièce' }], instructions: ['Cuire.'] };
const response = (value: object) => new Response(JSON.stringify(value), { status: 200 });
const generate = (text: string) => response({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });
const options = { key: 'SECRET', model: 'gemini-flash-latest' };
describe('Analyse serveur', () => {
  it('analyse le texte téléchargé, pas seulement une URL', async () => {
    const fetchPage = vi.fn().mockResolvedValue('Recette réelle téléchargée : deux carottes.');
    const fetch = vi.fn().mockResolvedValue(generate(JSON.stringify(recipe)));
    const result = await performAnalysis({ source: 'url', url: 'https://example.com/recipe' }, options, { fetchPage, fetch });
    expect(fetchPage).toHaveBeenCalledWith('https://example.com/recipe'); expect(result.title).toBe('Soupe');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.contents[0].parts[1].text).toContain('Recette réelle téléchargée');
    expect(fetch.mock.calls[0][0]).not.toContain('SECRET'); expect(fetch.mock.calls[0][1].headers['x-goog-api-key']).toBe('SECRET');
  });
  it('ne lance pas l’IA lorsque le téléchargement échoue', async () => {
    const fetch = vi.fn();
    await expect(performAnalysis({ source: 'url', url: 'https://example.com' }, options, { fetchPage: vi.fn().mockRejectedValue(new Error('Page indisponible')), fetch })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([[429,'RATE_LIMITED'],[403,'PROVIDER_ACCESS'],[503,'SERVICE_UNAVAILABLE'],[504,'ANALYSIS_TIMEOUT']])('traduit HTTP %i sans renvoyer le message fournisseur', async (status, code) => {
    const fetch = vi.fn().mockResolvedValue(new Response('SECRET', { status: Number(status) }));
    await expect(performAnalysis({ source: 'text', text: 'Recette' }, options, { fetchPage: vi.fn(), fetch })).rejects.toThrow(String(code));
  });
  it('détecte une réponse bloquée', async () => {
    await expect(performAnalysis({ source: 'text', text: 'Recette' }, options, { fetchPage: vi.fn(), fetch: vi.fn().mockResolvedValue(response({ promptFeedback: { blockReason: 'SAFETY' } })) })).rejects.toThrow('RESPONSE_BLOCKED');
  });
  it('détecte une réponse tronquée', async () => {
    await expect(performAnalysis({ source: 'text', text: 'Recette' }, options, { fetchPage: vi.fn(), fetch: vi.fn().mockResolvedValue(response({ candidates: [{ finishReason: 'MAX_TOKENS' }] })) })).rejects.toThrow('INCOMPLETE_RESPONSE');
  });
  it('détecte l’absence de recette', async () => {
    await expect(performAnalysis({ source: 'text', text: 'Recette' }, options, { fetchPage: vi.fn(), fetch: vi.fn().mockResolvedValue(generate('NO_RECIPE_FOUND')) })).rejects.toThrow('NO_RECIPE_FOUND');
  });
  it('valide la signature des images', () => {
    expect(() => validatePhoto({ source: 'photo', mimeType: 'image/png', image: Buffer.from('not an image').toString('base64') })).toThrow('INVALID_FILE');
    expect(() => validatePhoto({ source: 'photo', mimeType: 'image/png', image: Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64') })).not.toThrow();
  });
});
