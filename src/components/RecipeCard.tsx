import { Link } from 'react-router-dom';
import { Clock, Trash2, Heart } from 'lucide-react';
import type { Recipe } from '@/types/recipe';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props {
  recipe: Recipe;
  onDelete?: (id: string) => void;
  favorite?: boolean;
  onFavorite?: () => void;
}

export default function RecipeCard({ recipe, onDelete, favorite, onFavorite }: Props) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const authorTag = recipe.tags?.find((t) => t.toLowerCase().startsWith('auteur:'));
  const authorName = authorTag ? authorTag.split(':').slice(1).join(':').trim() : '';

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card shadow-xs transition-all hover:shadow-md animate-fade-in">
      <Link to={`/recette/${recipe.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <span className="font-serif text-4xl">🍽</span>
            </div>
          )}
          {authorName && (
            <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-amber-50">
              {authorName}
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-serif text-lg font-semibold leading-tight text-foreground line-clamp-2">
            {recipe.title}
          </h3>
          {totalTime > 0 && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{totalTime} min</span>
            </div>
          )}
          {recipe.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs bg-sage-light text-primary border-primary/20">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Link>
      {onFavorite && <Button type="button" size="icon" variant="outline" className="absolute right-14 top-1.5 h-11 w-11 bg-card" aria-label={`${favorite ? 'Retirer des' : 'Ajouter aux'} favoris : ${recipe.title}`} aria-pressed={!!favorite} onClick={onFavorite}><Heart className={favorite ? 'fill-primary text-primary h-5 w-5' : 'h-5 w-5'} /></Button>}
      {onDelete && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-1.5 top-1.5 h-11 w-11 rounded-full bg-black/40 text-amber-50 shadow-xs hover:bg-black/60"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(recipe.id);
          }}
          aria-label="Supprimer la recette"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
