import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import RecipeForm from '@/pages/RecipeForm';
import { RecipeAnalysisError } from '@/lib/recipeAnalysis';
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), insert: vi.fn(), single: vi.fn(), success: vi.fn(), error: vi.fn(), analyze: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate, useParams: () => ({}), useBlocker: () => ({ state: 'unblocked' }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', user_metadata: { username: 'Test' } }, loading: false }) }));
vi.mock('@/hooks/useRecipes', () => ({ useRecipe: () => ({ recipe: null, loading: false }) }));
vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/ImageUpload', () => ({ default: ({ onUploaded }: { onUploaded: (url: string) => void }) => <button type="button" onClick={() => onUploaded('https://example.test/cover.jpg')}>Simuler une couverture</button> }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ insert: mocks.insert }) } }));
vi.mock('@/lib/gemini', () => ({ analyzeRecipeImage: mocks.analyze, analyzeRecipeText: mocks.analyze, analyzeRecipeUrl: mocks.analyze }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
beforeEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); mocks.insert.mockReturnValue({ select: () => ({ single: mocks.single }) }); mocks.single.mockResolvedValue({ data: { id: 'new1' }, error: null }); });
function fill() {
  fireEvent.change(screen.getByLabelText('Titre'), { target: { value: '  Soupe  ' } });
  fireEvent.change(screen.getByLabelText('Instructions'), { target: { value: 'Faire cuire.' } });
}
describe('Édition de recette', () => {
  it('transmet le lien d’Annie et distingue une page inaccessible d’un lien invalide', async () => {
    const url = 'https://lacuisinedannie.20minutes.fr/recette-gratin-d-aubergines-rapide-225.html';
    mocks.analyze.mockRejectedValue(new RecipeAnalysisError('SOURCE_UNAVAILABLE'));
    render(<RecipeForm />); fill();
    screen.getByText('Importer une recette avec l’IA (facultatif)').closest('details')!.open = true;
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Lien/ }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByLabelText('Lien de la recette'), { target: { value: url } });
    fireEvent.click(screen.getByRole('button', { name: 'Compléter la recette' }));
    const alert = await screen.findByRole('alert');
    expect(mocks.analyze).toHaveBeenCalledWith(url);
    expect(alert).toHaveTextContent('IA-PAGE');
    expect(alert).not.toHaveTextContent('Ce lien n’est pas valide');
    expect(screen.getByLabelText('Titre')).toHaveValue('  Soupe  ');
  });
  it('refuse un lien mal formé avant l’appel serveur', async () => {
    render(<RecipeForm />);
    screen.getByText('Importer une recette avec l’IA (facultatif)').closest('details')!.open = true;
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Lien/ }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByLabelText('Lien de la recette'), { target: { value: 'pas une URL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('IA-LIEN');
    expect(mocks.analyze).not.toHaveBeenCalled();
  });
  it('affiche une erreur IA persistante et conserve la saisie', async () => {
    mocks.analyze.mockRejectedValue({ status: 429, message: 'quota SECRET' });
    render(<RecipeForm />); fill();
    screen.getByText('Importer une recette avec l’IA (facultatif)').closest('details')!.open = true;
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Texte/ }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByLabelText('Texte brut de la recette'), { target: { value: 'Ingrédients : deux carottes et un oignon. Préparation : cuire vingt minutes puis mixer.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Compléter la recette' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('La limite d’utilisation');
    expect(alert).toHaveTextContent('IA-QUOTA');
    expect(alert).not.toHaveTextContent('SECRET');
    expect(screen.getByLabelText('Titre')).toHaveValue('  Soupe  ');
    expect(screen.getByRole('button', { name: 'Publier la recette' })).toBeEnabled();
  });
  it('refuse une recette sans ingrédient', () => {
    render(<RecipeForm />); fill();
    fireEvent.submit(screen.getByRole('button', { name: 'Publier la recette' }).closest('form')!);
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.error).toHaveBeenCalled();
  });
  it('enregistre la couverture sans appeler IA et ouvre la recette', async () => {
    render(<RecipeForm />); fill();
    fireEvent.change(screen.getByLabelText('Nom ingrédient 1'), { target: { value: 'Carotte' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simuler une couverture' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Publier la recette' }).closest('form')!);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/recette/new1'));
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Soupe', image_url: 'https://example.test/cover.jpg', ingredients: [{ name: 'Carotte', unit: 'g', qty: 0 }] }));
    expect(mocks.analyze).not.toHaveBeenCalled();
  });
  it('garde le formulaire en cas de refus de la base', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { message: 'Écriture refusée' } });
    render(<RecipeForm />); fill();
    fireEvent.change(screen.getByLabelText('Nom ingrédient 1'), { target: { value: 'Carotte' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Publier la recette' }).closest('form')!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Écriture refusée'));
    expect(mocks.navigate).not.toHaveBeenCalled(); expect(screen.getByLabelText('Titre')).toHaveValue('  Soupe  ');
    expect(screen.getByRole('button', { name: 'Publier la recette' })).toBeEnabled();
  });
});
