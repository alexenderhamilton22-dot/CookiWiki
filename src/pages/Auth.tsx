import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChefHat, Mail, KeyRound, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Mode = 'login' | 'register' | 'magic';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithMagicLink } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'magic') {
        await signInWithMagicLink(email);
        toast.success('Lien magique envoyé ! Vérifiez votre boîte mail.');
      } else if (mode === 'register') {
        await signUp(email, password, username);
        toast.success('Compte créé ! Vérifiez votre email pour confirmer.');
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <ChefHat className="mx-auto h-10 w-10 text-secondary" />
          <h1 className="text-2xl font-bold">CookiWiki</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'register' ? 'Rejoindre la famille' : 'Bienvenue à table !'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" required placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
            </div>
          </div>

          {mode !== 'magic' && (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" required minLength={6} placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="username">Prénom ou pseudo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="username" required placeholder="Marie" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9" />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'magic' ? 'Envoyer le lien magique' : mode === 'register' ? "S'inscrire" : 'Se connecter'}
          </Button>
        </form>

        <div className="space-y-2 text-center text-sm">
          {mode === 'login' && (
            <>
              <button onClick={() => setMode('magic')} className="text-primary hover:underline block w-full">
                Connexion par lien magique
              </button>
              <button onClick={() => setMode('register')} className="text-muted-foreground hover:underline block w-full">
                Pas encore de compte ? S'inscrire
              </button>
            </>
          )}
          {mode === 'register' && (
            <button onClick={() => setMode('login')} className="text-muted-foreground hover:underline">
              Déjà un compte ? Se connecter
            </button>
          )}
          {mode === 'magic' && (
            <button onClick={() => setMode('login')} className="text-muted-foreground hover:underline">
              Retour à la connexion classique
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
