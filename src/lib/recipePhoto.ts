import { supabase } from '@/lib/supabase';

export async function uploadRecipePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choisissez une photo JPEG, PNG ou WebP.');
  if (file.size > 15 * 1024 * 1024) throw new Error('La photo dépasse 15 Mo.');
  const { default: imageCompression } = await import('browser-image-compression');
  const compressed = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true });
  const ext = compressed.type === 'image/png' ? 'png' : compressed.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('recipe-photos').upload(path, compressed, { contentType: compressed.type });
  if (error) throw error;
  const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path);
  return { url: data.publicUrl, compressed };
}
