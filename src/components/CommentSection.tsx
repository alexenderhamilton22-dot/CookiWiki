import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import type { Comment } from '@/types/recipe';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const message = (err: unknown) => {
  const e = err as { code?: string; message?: string };
  if (e.code === '42501') return 'Envoi refusé : vérifiez votre connexion et les droits de la table comments.';
  if (e.code === '23503') return 'Votre profil ou cette recette est absent de la base. Contactez l’administrateur.';
  return e.message || 'Impossible de joindre le serveur. Réessayez.';
};

export default function CommentSection({ recipeId }: { recipeId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [sent, setSent] = useState(false);
  const lock = useRef(false);
  const activeRecipe = useRef(recipeId);
  activeRecipe.current = recipeId;

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data, error } = await supabase.from('comments').select('*').eq('recipe_id', recipeId).order('created_at', { ascending: true });
      if (error) throw error;
      if (activeRecipe.current === recipeId) setComments((data || []) as Comment[]);
    } catch (err) {
      if (activeRecipe.current === recipeId) setLoadError(message(err));
    } finally {
      if (activeRecipe.current === recipeId) setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    setComments([]); setNewComment(''); setSendError(''); setSent(false);
    void fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = newComment.trim();
    if (!content || !user || lock.current) return;
    lock.current = true;
    setSending(true); setSendError(''); setSent(false);
    try {
      const { error } = await supabase.from('comments').insert({ recipe_id: recipeId, user_id: user.id, content });
      if (error) throw error;
      if (activeRecipe.current !== recipeId) return;
      setNewComment(''); setSent(true);
      await fetchComments();
    } catch (err) {
      if (activeRecipe.current === recipeId) setSendError(message(err));
    } finally {
      lock.current = false; setSending(false);
    }
  };

  return (
    <section className="space-y-4" aria-label="Commentaires">
      <h3 className="font-serif text-lg font-semibold">Commentaires ({comments.length})</h3>
      {loading && <p role="status">Chargement des commentaires…</p>}
      {loadError && <div role="alert" className="text-sm text-destructive">{loadError} <Button variant="outline" onClick={() => void fetchComments()}>Réessayer</Button></div>}
      {!loading && !loadError && !comments.length && <p className="text-sm text-muted-foreground">Partagez votre premier retour sur cette recette.</p>}
      {comments.map((c) => (
        <article key={c.id} className="rounded-lg bg-muted/50 p-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{c.profiles?.username || (c.user_id === user?.id ? user.user_metadata?.username || 'Vous' : 'Membre')}</span>
            <span className="text-xs text-muted-foreground">{!c.created_at || Number.isNaN(Date.parse(c.created_at)) ? '' : formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
        </article>
      ))}
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label htmlFor={`comment-${recipeId}`} className="text-sm font-medium">Votre commentaire</label>
          <Textarea id={`comment-${recipeId}`} value={newComment} disabled={sending} maxLength={5000} onChange={(e) => { setNewComment(e.target.value); setSent(false); }} placeholder="Une astuce, une variante, votre avis…" className="min-h-[90px] bg-card" />
          {sendError && <div className="space-y-1">
            <p role="alert" className="text-sm text-destructive">{sendError}</p>
            <p className="text-sm text-muted-foreground">Votre texte est conservé.</p>
          </div>}
          {sent && <p role="status" className="text-sm text-primary">Commentaire envoyé.</p>}
          <Button type="submit" disabled={sending || !newComment.trim()}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{sending ? 'Envoi…' : 'Publier le commentaire'}</Button>
        </form>
      ) : <p className="text-sm"><Link className="underline" to="/connexion">Connectez-vous</Link> pour commenter.</p>}
    </section>
  );
}
