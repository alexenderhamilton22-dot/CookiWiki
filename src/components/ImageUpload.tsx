import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadRecipePhoto } from '@/lib/recipePhoto';
import { toast } from 'sonner';

interface Props {
  currentUrl: string | null;
  onUploaded: (url: string, file: File) => void;
  onBusyChange?: (busy: boolean) => void;
}

export default function ImageUpload({ currentUrl, onUploaded, onBusyChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const busy = useRef(false);
  const handleFile = async (file: File) => {
    if (busy.current) return;
    busy.current = true;
    setUploading(true);
    onBusyChange?.(true);
    try {
      const { url, compressed } = await uploadRecipePhoto(file);
      onUploaded(url, compressed);
      toast.success('Photo prête. Enregistrez la recette pour conserver la couverture.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible d’envoyer la photo. Vérifiez les droits du dossier recipe-photos.');
    } finally {
      busy.current = false;
      setUploading(false);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };
  return (
    <div className="space-y-3" aria-busy={uploading}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Choisir une photo" onChange={(e) => { if (e.target.files?.[0]) void handleFile(e.target.files[0]); }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Photographier le plat" onChange={(e) => { if (e.target.files?.[0]) void handleFile(e.target.files[0]); }} />
      {currentUrl && <img src={currentUrl} alt="Couverture de la recette" className="w-full max-h-56 rounded-lg object-cover" />}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {uploading ? 'Envoi en cours…' : currentUrl ? 'Changer la photo' : 'Ajouter une photo'}
        </Button>
        <Button type="button" variant="outline" disabled={uploading} onClick={() => cameraRef.current?.click()}>Prendre une photo</Button>
      </div>
      <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP, 15 Mo maximum. La photo est compressée automatiquement.</p>
    </div>
  );
}
