import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { analyzeRecipeText } from '@/lib/gemini';
const mocks = vi.hoisted(()=>({session:vi.fn(),fetch:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{auth:{getSession:mocks.session}}}));
beforeEach(()=>{vi.clearAllMocks();mocks.session.mockResolvedValue({data:{session:{access_token:'TOKEN'}},error:null});vi.stubGlobal('fetch',mocks.fetch);});
afterEach(()=>vi.unstubAllGlobals());
describe('Transport IA navigateur',()=>{
  it('appelle seulement l’API locale avec la session',async()=>{
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({recipe:{ingredients:[{name:'Carotte',quantity:2,unit:'pièce'}],instructions:['Cuire']}}),{headers:{'content-type':'application/json'}}));
    await analyzeRecipeText('Recette');expect(mocks.fetch).toHaveBeenCalledWith('/api/analyze-recipe',expect.objectContaining({headers:expect.objectContaining({Authorization:'Bearer TOKEN'})}));
  });
  it('ne tente pas d’appel sans session',async()=>{mocks.session.mockResolvedValue({data:{session:null},error:null});await expect(analyzeRecipeText('Recette')).rejects.toThrow('SESSION_EXPIRED');expect(mocks.fetch).not.toHaveBeenCalled();});
  it('transmet le code sûr de l’API',async()=>{mocks.fetch.mockResolvedValue(new Response(JSON.stringify({error:{code:'RATE_LIMITED'}}),{status:429,headers:{'content-type':'application/json'}}));await expect(analyzeRecipeText('Recette')).rejects.toThrow('RATE_LIMITED');});
  it('signale un mauvais routage renvoyant du HTML',async()=>{mocks.fetch.mockResolvedValue(new Response('<html>Wrong route</html>',{headers:{'content-type':'text/html'}}));await expect(analyzeRecipeText('Recette')).rejects.toThrow('SERVICE_UNAVAILABLE');});
});
