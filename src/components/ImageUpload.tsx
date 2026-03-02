import { useRef, useState, useEffect } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

interface Props {
  currentUrl: string | null;
  onUploaded: (url: string, file: File) => void;
}

export default function ImageUpload({ currentUrl, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (currentUrl) {
      setPreview(currentUrl);
      setPreviewError(false);
    }
  }, [currentUrl]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const compressed = (await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      })) as File;
      const ext = compressed.type === 'image/png' ? 'png' : 'jpg';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('recipe-photos').upload(path, compressed);
      if (error) throw error;

      const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path);
      setPreview(data.publicUrl);
      onUploaded(data.publicUrl, compressed);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {preview ? (
        <div className="relative group">
          {previewError ? (
            <div className="w-full rounded-lg aspect-video flex items-center justify-center bg-muted text-xs text-muted-foreground">
              Image non disponible
            </div>
          ) : (
            <img
              src={preview}
              alt="Photo"
              className="w-full rounded-lg aspect-video object-cover"
              onError={() => setPreviewError(true)}
            />
          )}
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-card text-sm font-medium"
          >
            Changer la photo
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-32 border-dashed flex-col gap-2"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">{uploading ? 'Compression & envoi...' : 'Ajouter une photo'}</span>
        </Button>
      )}
    </div>
  );
}
