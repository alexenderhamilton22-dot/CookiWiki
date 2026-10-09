// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { extractRecipeSource, isPublicAddress, validateSourceUrl } from './source';
describe('Adresses de sources', () => {
  it.each(['127.0.0.1','10.0.0.1','172.16.2.3','192.168.1.1','169.254.169.254','0.0.0.0','100.64.0.1','224.0.0.1','::1','::','fe80::1','fc00::1','::ffff:127.0.0.1','2001:db8::1'])('refuse une adresse non publique %s', (ip) => expect(isPublicAddress(ip)).toBe(false));
  it.each(['8.8.8.8','1.1.1.1','2606:4700:4700::1111'])('accepte une adresse publique %s', (ip) => expect(isPublicAddress(ip)).toBe(true));
  it.each(['file:///etc/passwd','ftp://example.com','https://localhost','http://127.0.0.1','http://2130706433','http://[::ffff:127.0.0.1]','https://u:p@example.com','https://example.com:444/path'])('refuse une URL dangereuse %s', (url) => expect(() => validateSourceUrl(url)).toThrow('INVALID_URL'));
  it('accepte un lien HTTPS standard', () => expect(validateSourceUrl('https://example.com/recette').hostname).toBe('example.com'));
});
describe('Contenu réel de la page', () => {
  it('extrait un Recipe dans un graphe JSON-LD', () => {
    const html = '<script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":"Recipe","name":"Soupe","recipeIngredient":["2 carottes"],"recipeInstructions":"Cuire"}]}</script><nav>Ne pas utiliser</nav>';
    const result = extractRecipeSource(html); expect(result).toContain('2 carottes'); expect(result).not.toContain('Ne pas utiliser');
  });
  it('utilise le texte de l’article sans les scripts ni la navigation', () => {
    const result = extractRecipeSource('<nav>Menu SECRET</nav><script>SECRET</script><article>Recette de soupe. Ingrédients : deux carottes, un oignon. Faire cuire puis mixer.</article>');
    expect(result).toContain('deux carottes'); expect(result).not.toContain('SECRET');
  });
  it('refuse une page vide', () => expect(() => extractRecipeSource('<h1>Access denied</h1>')).toThrow('SOURCE_UNAVAILABLE'));
});
