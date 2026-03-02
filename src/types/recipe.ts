export interface Ingredient {
  name: string;
  qty: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: Ingredient[];
  instructions: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'Facile' | 'Moyen' | 'Difficile' | null;
  tags: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface Comment {
  id: string;
  recipe_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}
