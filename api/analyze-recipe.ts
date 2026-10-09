import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { analysisInput, performAnalysis } from '../server/analyze';
import { RecipeAnalysisError } from '../src/lib/recipeAnalysis';

export const config = { maxDuration: 60 };
export type ApiRequest = IncomingMessage & { body?: unknown };
const MAX_BODY_BYTES = 2 * 1024 * 1024;
function send(res: ServerResponse, status: number, body: object) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}
async function readBody(req: ApiRequest): Promise<unknown> {
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) throw new RecipeAnalysisError('INVALID_FILE');
  if (req.body !== undefined) {
    const text = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new RecipeAnalysisError('INVALID_FILE');
    try { return JSON.parse(text); } catch { throw new RecipeAnalysisError('MISSING_INPUT'); }
  }
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_BODY_BYTES) throw new RecipeAnalysisError('INVALID_FILE');
    chunks.push(bytes);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new RecipeAnalysisError('MISSING_INPUT'); }
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: { code: 'MISSING_INPUT' } }); }
  if (req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== req.headers.host) return send(res, 403, { error: { code: 'SESSION_EXPIRED' } }); }
    catch { return send(res, 403, { error: { code: 'SESSION_EXPIRED' } }); }
  }
  if (!req.headers['content-type']?.includes('application/json')) return send(res, 415, { error: { code: 'MISSING_INPUT' } });
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return send(res, 401, { error: { code: 'SESSION_EXPIRED' } });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const key = process.env.GEMINI_API_KEY;
  if (!url || !anonKey || !key) return send(res, 503, { error: { code: 'NOT_CONFIGURED' } });
  try {
    const input = analysisInput.safeParse(await readBody(req));
    if (!input.success) return send(res, 400, { error: { code: 'MISSING_INPUT' } });
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }) },
    });
    // getUser validates the token with Supabase; merely decoding a JWT is insufficient.
    const { data, error } = await supabase.auth.getUser(token);
    if (error && (error.status === undefined || error.status >= 500)) return send(res, 503, { error: { code: 'SERVICE_UNAVAILABLE' } });
    if (error || !data.user) return send(res, 401, { error: { code: 'SESSION_EXPIRED' } });
    // Durable atomic limit shared by all instances. Never fall back to an in-memory limit.
    const { data: allowed, error: rateError } = await supabase.rpc('consume_recipe_analysis');
    if (rateError) return send(res, 503, { error: { code: 'NOT_CONFIGURED' } });
    if (allowed !== true) { res.setHeader('Retry-After', '60'); return send(res, 429, { error: { code: 'RATE_LIMITED' } }); }
    const recipe = await performAnalysis(input.data, { key, model: process.env.GEMINI_MODEL || 'gemini-flash-latest' });
    return send(res, 200, { recipe });
  } catch (error) {
    const code = error instanceof RecipeAnalysisError ? error.code : 'SERVICE_UNAVAILABLE';
    const status = code === 'RATE_LIMITED' ? 429 : code === 'ANALYSIS_TIMEOUT' ? 504 : code === 'SERVICE_UNAVAILABLE' || code === 'PROVIDER_ACCESS' ? 502 : 422;
    return send(res, status, { error: { code } });
  }
}
