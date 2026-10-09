import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Ingredient } from '@/types/recipe';
import { formatRecipeQuantity } from '@/lib/recipeQuantity';

interface Props {
  ingredients: Ingredient[];
  baseServings: number;
}

export default function IngredientsList({ ingredients, baseServings }: Props) {
  const [servings, setServings] = useState(baseServings);
  const ratio = baseServings > 0 ? servings / baseServings : 1;

  const formatQty = (qty: number) => {
    return formatRecipeQuantity(qty, ratio);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-lg font-semibold">Ingrédients</h3>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 rounded-full"
            aria-label="Réduire le nombre de parts"
            onClick={() => setServings(Math.max(1, servings - 1))}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[3ch] text-center text-sm font-semibold">{servings}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 rounded-full"
            aria-label="Augmenter le nombre de parts"
            onClick={() => setServings(servings + 1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground pr-2">parts</span>
        </div>
      </div>
      <ul className="space-y-1.5">
        {ingredients.map((ing, i) => (
          <li key={i} className="flex items-baseline gap-2 text-sm">
            <span className="font-semibold text-secondary min-w-[4ch] text-right">
              {formatQty(ing.qty)}
            </span>
            <span className="text-muted-foreground">{ing.unit}</span>
            <span className="text-foreground">{ing.name}</span>
          </li>
        ))}
      </ul>
      {ingredients.some((i) => !i.qty) && <p className="mt-2 text-xs text-muted-foreground">— : quantité non précisée dans la recette.</p>}
    </div>
  );
}
