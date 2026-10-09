import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import ipaddr from 'ipaddr.js';
import { load } from 'cheerio';
import { RecipeAnalysisError } from '../src/lib/recipeAnalysis';

export function isPublicAddress(address: string): boolean {
  try {
    const ip = ipaddr.process(address);
    return ip.range() === 'unicast';
  } catch { return false; }
}
export function validateSourceUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new RecipeAnalysisError('INVALID_URL'); }
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port || !hostname.includes('.') && !isIP(hostname)) throw new RecipeAnalysisError('INVALID_URL');
  if (isIP(hostname) && !isPublicAddress(hostname)) throw new RecipeAnalysisError('INVALID_URL');
  return url;
}

// Resolve every redirect again and pin a checked address for the request (DNS rebinding).
export async function fetchSourcePage(value: string, remaining = 4, deadline = Date.now() + 10000): Promise<string> {
  const url = validateSourceUrl(value);
  if (Date.now() >= deadline) throw new RecipeAnalysisError('ANALYSIS_TIMEOUT');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: { address: string; family: number }[];
  let dnsTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await Promise.race([
      lookup(hostname, { all: true }),
      new Promise<never>((_, reject) => { dnsTimer = setTimeout(() => reject(new RecipeAnalysisError('ANALYSIS_TIMEOUT')), Math.max(1, deadline - Date.now())); }),
    ]);
  } catch (error) {
    throw error instanceof RecipeAnalysisError ? error : new RecipeAnalysisError('SOURCE_UNAVAILABLE');
  } finally { if (dnsTimer) clearTimeout(dnsTimer); }
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address))) throw new RecipeAnalysisError('SOURCE_UNAVAILABLE');
  const pinned = addresses[0];
  const result = await new Promise<{ status: number; location?: string; html: string }>((resolve, reject) => {
    const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = request(url, {
      family: pinned.family,
      headers: { 'User-Agent': 'CookiWiki/1.2 recipe-import', Accept: 'text/html,application/xhtml+xml', 'Accept-Encoding': 'identity' },
      lookup: (_host, _options, callback) => callback(null, pinned.address, pinned.family),
    }, (res) => {
      const status = res.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status)) { res.resume(); resolve({ status, location: res.headers.location, html: '' }); return; }
      if (status !== 200 || !/text\/html|application\/xhtml\+xml/.test(res.headers['content-type'] || '')) { res.resume(); reject(new RecipeAnalysisError('SOURCE_UNAVAILABLE')); return; }
      const chunks: Buffer[] = []; let bytes = 0;
      res.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 2 * 1024 * 1024) { req.destroy(); reject(new RecipeAnalysisError('SOURCE_UNAVAILABLE')); return; }
        chunks.push(chunk);
      });
      res.on('end', () => resolve({ status, html: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', () => reject(new RecipeAnalysisError('SOURCE_UNAVAILABLE')));
    });
    const timer = setTimeout(() => req.destroy(new RecipeAnalysisError('ANALYSIS_TIMEOUT')), Math.max(1, deadline - Date.now()));
    req.on('close', () => clearTimeout(timer));
    req.on('error', (err) => reject(err instanceof RecipeAnalysisError ? err : new RecipeAnalysisError('SOURCE_UNAVAILABLE')));
    req.end();
  });
  if (result.location) {
    if (!remaining) throw new RecipeAnalysisError('SOURCE_UNAVAILABLE');
    let redirect: URL;
    try { redirect = validateSourceUrl(new URL(result.location, url).href); }
    catch { throw new RecipeAnalysisError('SOURCE_UNAVAILABLE'); }
    return fetchSourcePage(redirect.href, remaining - 1, deadline);
  }
  if (result.status !== 200) throw new RecipeAnalysisError('SOURCE_UNAVAILABLE');
  return extractRecipeSource(result.html);
}

export function extractRecipeSource(html: string): string {
  const $ = load(html);
  const recipes: unknown[] = [];
  const visit = (item: unknown, depth = 0) => {
    if (depth > 8 || recipes.length >= 5) return;
    if (Array.isArray(item)) { item.forEach((v) => visit(v, depth + 1)); return; }
    if (!item || typeof item !== 'object') return;
    const object = item as Record<string, unknown>;
    const types = Array.isArray(object['@type']) ? object['@type'] : [object['@type']];
    if (types.includes('Recipe') || types.includes('https://schema.org/Recipe')) recipes.push(object);
    for (const key of ['@graph', 'mainEntity', 'itemListElement', 'item']) if (object[key]) visit(object[key], depth + 1);
  };
  $('script[type="application/ld+json"]').each((_, element) => {
    try { visit(JSON.parse($(element).text())); } catch { /* Ignore malformed unrelated metadata. */ }
  });
  if (recipes.length) return `Données Recipe présentes dans la page :\n${JSON.stringify(recipes).slice(0, 30000)}`;
  $('script, style, nav, header, footer, aside, noscript, iframe, form').remove();
  const content = $('article').first().text() || $('main').first().text() || $('body').text();
  const text = content.replace(/\s+/g, ' ').trim().slice(0, 30000);
  if (text.length < 50) throw new RecipeAnalysisError('SOURCE_UNAVAILABLE');
  return text;
}
