import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import CommentSection from '@/components/CommentSection';
const mocks = vi.hoisted(() => ({ insert: vi.fn(), order: vi.fn(), user: { id: 'user1', user_metadata: { username: 'Test' } } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ insert: mocks.insert, select: () => ({ eq: () => ({ order: mocks.order }) }) }) } }));
beforeEach(() => { cleanup(); mocks.insert.mockReset(); mocks.order.mockReset(); mocks.order.mockResolvedValue({ data: [], error: null }); });
describe('Commentaires', () => {
  it('conserve le texte et signale un refus de droits', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '42501' } });
    render(<CommentSection recipeId="recipe1" />);
    fireEvent.change(screen.getByLabelText('Votre commentaire'), { target: { value: 'Très bon !' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publier le commentaire' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Votre commentaire')).toHaveValue('Très bon !');
    expect(screen.getByRole('button', { name: 'Publier le commentaire' })).toBeEnabled();
  });
  it('envoie le bon auteur et efface après succès', async () => {
    mocks.insert.mockResolvedValue({ error: null });
    render(<CommentSection recipeId="recipe1" />);
    fireEvent.change(screen.getByLabelText('Votre commentaire'), { target: { value: '  Très bon !  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publier le commentaire' }));
    await waitFor(() => expect(screen.getByLabelText('Votre commentaire')).toHaveValue(''));
    expect(mocks.insert).toHaveBeenCalledWith({ recipe_id: 'recipe1', author_id: 'user1', content: 'Très bon !' });
  });
  it('permet de réessayer après une erreur réseau', async () => {
    mocks.insert.mockRejectedValueOnce(new Error('Réseau indisponible')).mockResolvedValueOnce({ error: null });
    render(<CommentSection recipeId="recipe1" />);
    fireEvent.change(screen.getByLabelText('Votre commentaire'), { target: { value: 'Mon avis' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publier le commentaire' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Publier le commentaire' }));
    await waitFor(() => expect(screen.getByLabelText('Votre commentaire')).toHaveValue(''));
    expect(mocks.insert).toHaveBeenCalledTimes(2);
  });
  it('bloque un second envoi pendant la requête', async () => {
    let resolve!: (value: unknown) => void;
    mocks.insert.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<CommentSection recipeId="recipe1" />);
    fireEvent.change(screen.getByLabelText('Votre commentaire'), { target: { value: 'Mon avis' } });
    const button = screen.getByRole('button', { name: 'Publier le commentaire' });
    fireEvent.click(button); fireEvent.click(button);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    resolve({ error: null });
    await waitFor(() => expect(screen.getByLabelText('Votre commentaire')).toHaveValue(''));
  });
  it('signale un échec de chargement', async () => {
    mocks.order.mockResolvedValue({ error: { message: 'Lecture refusée' } });
    render(<CommentSection recipeId="recipe1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Lecture refusée');
  });
});
