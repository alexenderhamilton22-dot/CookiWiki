// @vitest-environment node
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn(), location: '', pinned: [] as unknown[] }));
vi.mock('node:dns/promises', () => ({ lookup: mocks.lookup }));
vi.mock('node:http', () => ({ request: mocks.request }));
vi.mock('node:https', () => ({ request: mocks.request }));
import { fetchSourcePage } from './source';
beforeEach(() => {
  vi.clearAllMocks(); mocks.location=''; mocks.pinned=[];
  mocks.lookup.mockResolvedValue([{address:'8.8.8.8',family:4}]);
  mocks.request.mockImplementation((_url: URL, options: { lookup: (host: string, options: object, cb: (...args: unknown[])=>void)=>void }, callback: (res: PassThrough & {statusCode:number;headers:object})=>void) => {
    options.lookup('host',{},(...args)=>{mocks.pinned=args;});
    const emitter = new EventEmitter();
    return {
      on: (name:string,fn:(...args:unknown[])=>void)=>{emitter.on(name,fn);},
      destroy: (error?:Error)=>{if(error)emitter.emit('error',error);emitter.emit('close');},
      end: ()=>queueMicrotask(()=>{
        const res=Object.assign(new PassThrough(),{statusCode:mocks.location?302:200,headers:mocks.location?{location:mocks.location}:{'content-type':'text/html'}});
        callback(res);res.end('<article>Recette complète : deux carottes et un oignon. Faire cuire puis mixer.</article>');emitter.emit('close');
      }),
    };
  });
});
describe('Téléchargement sécurisé',()=>{
  it('refuse une résolution DNS vers une adresse privée',async()=>{
    mocks.lookup.mockResolvedValue([{address:'127.0.0.1',family:4}]);await expect(fetchSourcePage('https://recipe.test')).rejects.toThrow('SOURCE_UNAVAILABLE');expect(mocks.request).not.toHaveBeenCalled();
  });
  it('refuse une résolution mélangeant adresses publiques et privées',async()=>{
    mocks.lookup.mockResolvedValue([{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]);await expect(fetchSourcePage('https://recipe.test')).rejects.toThrow('SOURCE_UNAVAILABLE');expect(mocks.request).not.toHaveBeenCalled();
  });
  it('épingle l’adresse validée pour éviter une seconde résolution DNS',async()=>{
    expect(await fetchSourcePage('https://recipe.test')).toContain('deux carottes');expect(mocks.lookup).toHaveBeenCalledTimes(1);expect(mocks.pinned).toEqual([null,'8.8.8.8',4]);
  });
  it('refuse une redirection vers un réseau privé',async()=>{
    mocks.location='http://169.254.169.254/latest/meta-data';await expect(fetchSourcePage('https://recipe.test')).rejects.toThrow('SOURCE_UNAVAILABLE');expect(mocks.request).toHaveBeenCalledTimes(1);
  });
});
