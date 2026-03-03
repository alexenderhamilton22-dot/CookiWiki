import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('VITE_GEMINI_API_KEY is not set. Gemini features will not work.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

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

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    const withoutFence = trimmed.replace(/^```[a-zA-Z]*\s*/, '').replace(/```$/, '').trim();
    return withoutFence;
  }
  return trimmed;
}

const BASE_JSON_FORMAT = `
Tu es un expert en cuisine. Ta mission est STRICTEMENT d'extraire la recette présente dans le texte fourni.

Si le texte ou le document ne contient pas de recette exploitable (ingrédients + étapes), tu dois répondre UNIQUEMENT :
NO_RECIPE_FOUND

Sinon, tu dois toujours renvoyer STRICTEMENT un JSON valide (pas de markdown, pas de texte autour) au format suivant :
{
  "title": "Titre de la recette",
  "description": "Courte description de la recette si disponible, sinon une phrase synthétique",
  "prepTimeMinutes": 0,
  "cookTimeMinutes": 0,
  "servings": 0,
  "difficulty": "Facile" | "Moyen" | "Difficile",
  "imageUrl": "https://exemple.com/mon-image-de-recette.jpg",
  "ingredients": [
    { "name": "nom de l'ingrédient", "quantity": 0, "unit": "g, ml, c.à.s, etc." }
  ],
  "instructions": [
    "Étape 1...",
    "Étape 2...",
    "Étape 3..."
  ],
  "tags": [
    "type de plat (ex: déjeuner, dîner, dessert)",
    "difficulté (ex: facile, moyen, avancé)",
    "régime ou particularité (ex: végétarien, sans gluten, rapide, batch cooking)"
  ]
}

Règles importantes :
- Les nombres (temps, portions, quantités, servings) doivent être des nombres, pas des chaînes.
- Le champ "difficulty" doit STRICTEMENT être l'une des trois valeurs suivantes : "Facile", "Moyen" ou "Difficile" (avec cette orthographe et ces majuscules).
- Si une information est absente, fais une meilleure estimation raisonnable (par exemple servings = 4).
- Les instructions doivent être découpées en étapes claires dans un tableau.
- Le champ "tags" doit être un tableau de chaînes décrivant au minimum le type de plat, la difficulté et, si possible, le régime ou une caractéristique comme "rapide" ou "batch cooking".
- Ne renvoie AUCUN autre texte que le JSON.
- N'invente JAMAIS de recette ni de contenu : si la source n'est pas une vraie recette, réponds simplement NO_RECIPE_FOUND.
`;

export async function analyzeRecipeImage(file: File): Promise<AnalyzedRecipe> {
  if (!genAI) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const imagePart = {
    inlineData: {
      data: await fileToBase64(file),
      mimeType: file.type || 'image/jpeg',
    },
  };

  const prompt = `
${BASE_JSON_FORMAT}

Source : photo (photo de fiche, capture d'écran, photo d'une recette papier prise au smartphone, etc.).

Ceci est la photo d'une recette de cuisine. Extrais le titre, la liste des ingrédients et les étapes de préparation pour remplir un formulaire de recette.
Analyse l'image fournie et renvoie le JSON décrit ci-dessus.
`;

  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text();

  const jsonString = extractJson(text);

  try {
    const parsed = JSON.parse(jsonString);
    return parsed as AnalyzedRecipe;
  } catch (err) {
    console.error('Failed to parse Gemini response as JSON', err, jsonString);
    throw new Error("La réponse de l'IA n'a pas pu être interprétée.");
  }
}

export async function analyzeRecipeUrl(url: string): Promise<AnalyzedRecipe> {
  if (!genAI) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const prompt = `
${BASE_JSON_FORMAT}

Source : lien web d'une page de recette de cuisine.
URL : ${url}

Si tu peux accéder au contenu de cette page, analyse-la pour extraire la recette complète et renvoie le JSON décrit ci-dessus.
Si le lien ne contient pas suffisamment d'informations de recette, fais de ton mieux avec ce que tu trouves.
`;

  const result = await model.generateContent([prompt]);
  const text = result.response.text();
  const jsonString = extractJson(text);

  try {
    const parsed = JSON.parse(jsonString);
    return parsed as AnalyzedRecipe;
  } catch (err) {
    console.error('Failed to parse Gemini URL response as JSON', err, jsonString);
    throw new Error("La réponse de l'IA n'a pas pu être interprétée pour ce lien.");
  }
}

export async function analyzeRecipeText(text: string): Promise<AnalyzedRecipe> {
  if (!genAI) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const prompt = `
${BASE_JSON_FORMAT}

Source : texte brut d'une recette de cuisine (copié-collé depuis un site, un PDF, une note, etc.).

Texte de la recette :
"""
${text}
"""

Analyse ce texte pour extraire la recette complète et renvoie le JSON décrit ci-dessus.
`;

  const result = await model.generateContent([prompt]);
  const responseText = result.response.text();
  const jsonString = extractJson(responseText);

  const trimmed = jsonString.trim();
  if (trimmed === 'NO_RECIPE_FOUND') {
    throw new Error('NO_RECIPE_FOUND');
  }

  try {
    const parsed = JSON.parse(jsonString);
    return parsed as AnalyzedRecipe;
  } catch (err) {
    console.error('Failed to parse Gemini text response as JSON', err, jsonString);
    throw new Error("La réponse de l'IA n'a pas pu être interprétée pour ce texte.");
  }
}