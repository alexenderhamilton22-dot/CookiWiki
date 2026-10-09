export interface AnalyzedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export type Difficulty = 'Facile' | 'Moyen' | 'Difficile';

export interface AnalyzedRecipe {
  title?: string;
  description?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  ingredients?: AnalyzedIngredient[];
  instructions?: string[] | string;
  tags?: string[];
  difficulty?: Difficulty | string;
  imageUrl?: string;
  image_url?: string;
}

