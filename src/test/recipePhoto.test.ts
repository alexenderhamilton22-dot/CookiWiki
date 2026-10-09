import { describe, it, expect, vi } from 'vitest';
import { uploadRecipePhoto } from '@/lib/recipePhoto';
const mocks = vi.hoisted(() => ({ upload: vi.fn(), compress: vi.fn() }));
vi.mock('browser-image-compression', () => ({ default: mocks.compress }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ upload: mocks.upload, getPublicUrl: () => ({ data: { publicUrl: 'https://example.test/photo.webp' } }) }) } } }));
describe('Photos', () => {
  it('refuse les formats non pris en charge', async () => {
    await expect(uploadRecipePhoto(new File(['x'], 'f.svg', { type: 'image/svg+xml' }))).rejects.toThrow('JPEG');
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('refuse une photo trop lourde', async () => {
    const file = new File(['x'], 'f.jpg', { type: 'image/jpeg' }); Object.defineProperty(file, 'size', { value: 16 * 1024 * 1024 });
    await expect(uploadRecipePhoto(file)).rejects.toThrow('15 Mo');
  });
  it('conserve le type webp lors de l’envoi', async () => {
    const file = new File(['x'], 'f.webp', { type: 'image/webp' }); mocks.compress.mockResolvedValue(file); mocks.upload.mockResolvedValue({ error: null });
    const result = await uploadRecipePhoto(file);
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/\.webp$/), file, { contentType: 'image/webp' }); expect(result.url).toContain('photo.webp');
  });
});
