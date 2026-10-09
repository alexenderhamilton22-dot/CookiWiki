import { useState } from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useRecipeDraft } from '@/hooks/useRecipeDraft';
import { emptyRecipeDraft, writeRecipeDraft } from '@/lib/recipeDraft';
function Editor() {
  const [data,setData] = useState(emptyRecipeDraft);
  const draft = useRecipeDraft({storageKey:'draft1', data, initial:emptyRecipeDraft, ready:true, restore:setData});
  return <div>
    <input aria-label="Titre" value={data.title} onChange={(e)=>setData({...data,title:e.target.value})}/>
    <span>{draft.storageStatus}</span>
    {draft.candidate && <button onClick={draft.restoreCandidate}>Restaurer</button>}
    <button onClick={draft.markSaved}>Marquer enregistré</button>
    {draft.blocker.state==='blocked' && <><p>Navigation bloquée</p><button onClick={draft.blocker.reset}>Rester</button><button onClick={draft.blocker.proceed}>Quitter</button></>}
  </div>;
}
function mount(){const router=createMemoryRouter([{path:'/',element:<Editor/>},{path:'/other',element:<p>Autre page</p>}]);render(<RouterProvider router={router}/>);return router;}
const NativeRequest = globalThis.Request;
beforeEach(()=>{
  cleanup();localStorage.clear();
  // Node fetch and jsdom expose different AbortSignal constructors. These routes have no loaders.
  vi.stubGlobal('Request', class extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) { super(input, { ...init, signal: undefined }); }
  });
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('Protection de saisie',()=>{
  it('sauvegarde automatiquement après saisie',async()=>{mount();fireEvent.change(screen.getByLabelText('Titre'),{target:{value:'Soupe'}});await waitFor(()=>expect(localStorage.getItem('draft1')).toContain('Soupe'));});
  it('propose un brouillon sans écraser automatiquement les champs',()=>{writeRecipeDraft(localStorage,'draft1',{...emptyRecipeDraft,title:'Soupe'});mount();expect(screen.getByLabelText('Titre')).toHaveValue('');fireEvent.click(screen.getByRole('button',{name:'Restaurer'}));expect(screen.getByLabelText('Titre')).toHaveValue('Soupe');});
  it('bloque une navigation et permet de revenir à la saisie',async()=>{const router=mount();fireEvent.change(screen.getByLabelText('Titre'),{target:{value:'Soupe'}});await act(async()=>{await router.navigate('/other');});expect(screen.getByText('Navigation bloquée')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Rester'}));expect(screen.getByLabelText('Titre')).toHaveValue('Soupe');});
  it('permet de quitter tout en conservant le brouillon',async()=>{const router=mount();fireEvent.change(screen.getByLabelText('Titre'),{target:{value:'Soupe'}});await act(async()=>{await router.navigate('/other');});fireEvent.click(screen.getByRole('button',{name:'Quitter'}));expect(await screen.findByText('Autre page')).toBeInTheDocument();expect(localStorage.getItem('draft1')).toContain('Soupe');});
  it('nettoie le brouillon et ne bloque pas après enregistrement',async()=>{const router=mount();fireEvent.change(screen.getByLabelText('Titre'),{target:{value:'Soupe'}});fireEvent.click(screen.getByRole('button',{name:'Marquer enregistré'}));await act(async()=>{await router.navigate('/other');});expect(await screen.findByText('Autre page')).toBeInTheDocument();expect(localStorage.getItem('draft1')).toBeNull();});
  it('avertit lors du rechargement',()=>{mount();fireEvent.change(screen.getByLabelText('Titre'),{target:{value:'Soupe'}});const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);});
  it('continue à fonctionner si le stockage est refusé',()=>{vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Quota exceeded');});mount();fireEvent.change(screen.getByLabelText('Titre'),{target:{value:'Soupe'}});expect(screen.getByText('failed')).toBeInTheDocument();expect(screen.getByLabelText('Titre')).toHaveValue('Soupe');});
});
