// @vitest-environment node
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import type { ServerResponse } from 'node:http';
import handler, { type ApiRequest } from '../api/analyze-recipe';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), perform: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock('../server/analyze', async (actual) => ({ ...await actual<object>(), performAnalysis: mocks.perform }));
function req(patch: Partial<ApiRequest> = {}): ApiRequest {
  return { method: 'POST', headers: { host: 'example.test', 'content-type': 'application/json', authorization: 'Bearer token' }, body: { source: 'text', text: 'Deux carottes et un oignon. Faire cuire vingt minutes, puis mixer la soupe.' }, ...patch } as ApiRequest;
}
function res() {
  const result = { statusCode: 0, body: '', headers: {} as Record<string, string>, setHeader: (name: string, value: string) => { result.headers[name] = value; }, end: (body: string) => { result.body = body; } };
  return result;
}
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('SUPABASE_ANON_KEY', 'anon'); vi.stubEnv('GEMINI_API_KEY', 'SECRET');
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }); mocks.rpc.mockResolvedValue({ data: true, error: null }); mocks.perform.mockResolvedValue({ title: 'Soupe' });
});
afterEach(() => vi.unstubAllEnvs());
async function run(request: ApiRequest) { const response = res(); await handler(request, response as unknown as ServerResponse); return response; }
describe('API authentifiée', () => {
  it('rejette les requêtes sans session avant tout appel IA', async () => {
    const response = await run(req({ headers: { 'content-type': 'application/json' } })); expect(response.statusCode).toBe(401); expect(mocks.perform).not.toHaveBeenCalled();
  });
  it('valide réellement la session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    expect((await run(req())).statusCode).toBe(401); expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.perform).not.toHaveBeenCalled();
  });
  it('refuse de fonctionner sans configuration serveur', async () => {
    vi.stubEnv('GEMINI_API_KEY', ''); const response = await run(req()); expect(response.body).toContain('NOT_CONFIGURED'); expect(mocks.perform).not.toHaveBeenCalled();
  });
  it('bloque un quota dépassé avant appel IA', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null }); const response = await run(req()); expect(response.statusCode).toBe(429); expect(mocks.perform).not.toHaveBeenCalled();
  });
  it('bloque les appels si la migration de limitation manque', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error() }); expect((await run(req())).body).toContain('NOT_CONFIGURED'); expect(mocks.perform).not.toHaveBeenCalled();
  });
  it('limite la taille du corps', async () => {
    const response = await run(req({ body: { source: 'text', text: 'x'.repeat(2200000) } })); expect(response.statusCode).toBe(422); expect(mocks.perform).not.toHaveBeenCalled();
  });
  it('rejette une origine différente', async () => {
    expect((await run(req({ headers: { origin: 'https://evil.test', host: 'example.test' } }))).statusCode).toBe(403);
  });
  it('rejette GET', async () => expect((await run(req({ method: 'GET' }))).statusCode).toBe(405));
  it('rejette des entrées invalides', async () => { expect((await run(req({ body: { source: 'text', text: 'Court' } }))).statusCode).toBe(400); expect(mocks.perform).not.toHaveBeenCalled(); });
  it('renvoie la recette et empêche la mise en cache', async () => {
    const response = await run(req()); expect(response.statusCode).toBe(200); expect(response.headers['Cache-Control']).toBe('no-store'); expect(response.body).toContain('Soupe');
  });
  it('ne renvoie jamais une erreur brute ou un secret', async () => {
    mocks.perform.mockRejectedValue(new Error('SECRET https://provider.test')); const response = await run(req()); expect(response.body).not.toContain('SECRET'); expect(response.body).not.toContain('provider.test');
  });
});
