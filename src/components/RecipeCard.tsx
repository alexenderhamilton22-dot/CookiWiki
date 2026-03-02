import { Link } from 'react-router-dom';
import { Clock, Trash2 } from 'lucide-react';
import type { Recipe } from '@/types/recipe';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props {
  recipe: Recipe;
  onDelete?: (id: string) => void;
}

export default function RecipeCard({ recipe, onDelete }: Props) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const authorTag = recipe.tags?.find((t) => t.toLowerCase().startsWith('auteur:'));
  const authorName = authorTag ? authorTag.split(':').slice(1).join(':').trim() : '';

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:shadow-md animate-fade-in">
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
      {onDelete && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-black/40 text-amber-50 opacity-0 shadow-sm transition-opacity hover:bg-black/60 group-hover:opacity-100"
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
