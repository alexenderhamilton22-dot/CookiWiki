import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import type { Comment } from '@/types/recipe';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CommentSection({ recipeId }: { recipeId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setComments(data as Comment[]);
    }
  };

  useEffect(() => { fetchComments(); }, [recipeId]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    setSending(true);
    await supabase.from('comments').insert({
      recipe_id: recipeId,
      author_id: user.id,
      content: newComment.trim(),
    });
    setNewComment('');
    await fetchComments();
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg font-semibold">Commentaires ({comments.length})</h3>

      {comments.map((c) => (
        <div key={c.id} className="rounded-lg bg-muted/50 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              {c.profiles?.username || 'Anonyme'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
          <p className="text-sm text-foreground">{c.content}</p>
        </div>
      ))}

      {user ? (
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="min-h-[60px] bg-card"
          />
          <Button size="icon" onClick={handleSubmit} disabled={sending || !newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Connectez-vous pour commenter.</p>
      )}
    </div>
  );
}
