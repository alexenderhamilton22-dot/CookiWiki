import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { useRecipes } from '@/hooks/useRecipes';
const mocks = vi.hoisted(() => ({ range:vi.fn(), removeChannel:vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase:{
  from:() => { const query = {order:()=>query, range:mocks.range};return {select:()=>query}; },
  channel:() => {const channel={on:()=>channel,subscribe:()=>channel};return channel;},
  removeChannel:mocks.removeChannel,
} }));
afterEach(cleanup);
beforeEach(() => {vi.clearAllMocks();});
describe('Bibliothèque complète et compteurs', () => {
  it('charge au-delà de la limite PostgREST au lieu de tronquer le total', async () => {
    const recipes=Array.from({length:1001},(_,index)=>({id:String(index),title:`Recette ${index}`}));
    mocks.range.mockImplementation(async (start:number,end:number)=>({data:recipes.slice(start,end+1),error:null}));
    const {result}=renderHook(useRecipes);
    await waitFor(()=>expect(result.current.loading).toBe(false));
    expect(result.current.recipes).toHaveLength(1001);
    expect(mocks.range.mock.calls).toEqual([[0,499],[500,999],[1000,1499]]);
  });
  it('signale une page manquante au lieu d’afficher un total partiel', async () => {
    mocks.range.mockResolvedValueOnce({data:Array.from({length:500},(_,index)=>({id:String(index)})),error:null}).mockResolvedValueOnce({data:null,error:new Error('Indisponible')});
    const {result}=renderHook(useRecipes);
    await waitFor(()=>expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain('Impossible de charger');
    expect(result.current.recipes).toHaveLength(0);
  });
});
