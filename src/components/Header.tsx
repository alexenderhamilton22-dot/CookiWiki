import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Plus, ChefHat } from 'lucide-react';

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-secondary" />
          <span className="font-serif text-xl font-bold text-foreground">CookiWiki</span>
        </Link>
        <div className="flex items-center gap-2">
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
