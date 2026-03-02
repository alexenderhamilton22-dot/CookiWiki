import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Plus } from 'lucide-react';

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName =
    (user?.user_metadata as any)?.username ||
    (user?.email ? user.email.split('@')[0] : '') ||
    '';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logo_CookiWik.png"
            alt="CookiWiki"
            className="h-32 w-auto"
          />
        </Link>
        <div className="flex items-center gap-3">
          {user && displayName && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {displayName}
            </span>
          )}
          {user ? (
            <>
              <Button size="sm" onClick={() => navigate('/recette/nouvelle')} className="gap-1">
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
              <Button size="sm" variant="ghost" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => navigate('/connexion')}>
              Se connecter
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
