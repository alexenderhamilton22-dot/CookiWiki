import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RecipeDetail from '@/pages/RecipeDetail';
const mocks = vi.hoisted(() => ({ request: vi.fn(), release: vi.fn(), recordView: vi.fn(), favorite: vi.fn() }));
vi.mock('react-router-dom', () => ({ useParams: () => ({id:'recipe1'}), useNavigate: () => vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({user:null}) }));
vi.mock('@/hooks/useRecipes', () => ({ useRecipe: () => ({ loading:false, recipe:{id:'recipe1', title:'Soupe', instructions:'1. Couper.\n2. Cuire.', ingredients:[], servings:4, tags:[], updated_at:'2026-10-09'} }) }));
vi.mock('@/hooks/usePersonalRecipes', () => ({ usePersonalRecipes: () => ({records:[],recordView:mocks.recordView,toggleFavorite:mocks.favorite}) }));
vi.mock('@/lib/supabase', () => ({supabase:{}}));
vi.mock('@/components/Header', () => ({default:()=>null}));
vi.mock('@/components/CommentSection', () => ({default:()=>null}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.release.mockResolvedValue(undefined);
  mocks.request.mockImplementation(async () => ({ release:mocks.release, addEventListener:vi.fn() }));
  vi.stubGlobal('navigator', {wakeLock:{request:mocks.request}});
  Object.defineProperty(document, 'visibilityState', {configurable:true,value:'visible'});
});
afterEach(() => {cleanup();vi.unstubAllGlobals();});
describe('Écran maintenu actif', () => {
  it('libère aussi un verrou obtenu après la fermeture de la fiche', async () => {
    let acquire!: (value: { release: typeof mocks.release; addEventListener: ReturnType<typeof vi.fn> }) => void;
    mocks.request.mockImplementation(() => new Promise((resolve) => { acquire = resolve; }));
    const view = render(<RecipeDetail />);
    view.unmount();
    acquire({release:mocks.release,addEventListener:vi.fn()});
    await waitFor(() => expect(mocks.release).toHaveBeenCalledTimes(1));
  });
  it('conserve le verrou écran pendant le mode cuisine et sa progression', async () => {
    const view = render(<RecipeDetail />);
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith('screen'));
    fireEvent.click(screen.getByText('Mode cuisine'));
    fireEvent.click(screen.getByLabelText('Étape 1 terminée'));
    fireEvent.click(screen.getByText('Mode normal'));
    expect(mocks.release).not.toHaveBeenCalled();
    expect(mocks.request).toHaveBeenCalledTimes(1);
    view.unmount(); await waitFor(() => expect(mocks.release).toHaveBeenCalledTimes(1));
  });
  it('reprend le verrou écran au retour dans l’onglet', async () => {
    render(<RecipeDetail />);
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
    Object.defineProperty(document, 'visibilityState', {configurable:true,value:'hidden'});
    fireEvent(document, new Event('visibilitychange'));
    await waitFor(() => expect(mocks.release).toHaveBeenCalledTimes(1));
    Object.defineProperty(document, 'visibilityState', {configurable:true,value:'visible'});
    fireEvent(document, new Event('visibilitychange'));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2));
  });
});
