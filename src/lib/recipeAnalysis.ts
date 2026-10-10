import { z } from 'zod';
import type { AnalyzedRecipe } from '../types/analysis.js';

export type AnalysisSource = 'photo' | 'url' | 'text';
export type AnalysisErrorCode = 'NOT_CONFIGURED' | 'NO_RECIPE_FOUND' | 'INVALID_RESPONSE' | 'INCOMPLETE_RESPONSE' | 'UNREADABLE_FILE' | 'INVALID_FILE' | 'INVALID_URL' | 'MISSING_INPUT' | 'SESSION_EXPIRED' | 'RATE_LIMITED' | 'PROVIDER_ACCESS' | 'SERVICE_UNAVAILABLE' | 'ANALYSIS_TIMEOUT' | 'SOURCE_UNAVAILABLE' | 'RESPONSE_BLOCKED';
export class RecipeAnalysisError extends Error {
  constructor(public readonly code: AnalysisErrorCode) {
    super(code);
    this.name = 'RecipeAnalysisError';
  }
}
export interface AnalysisFeedback { title: string; advice: string; reference: string; }

const nextStep = (source: AnalysisSource) => source === 'photo'
  ? 'Prenez une photo nette, bien éclairée et cadrée sur les ingrédients et les étapes, ou collez le texte de la recette dans l’onglet Texte.'
  : source === 'url'
    ? 'Le contenu du site n’est pas toujours accessible à l’IA. Ouvrez la page, copiez les ingrédients et les étapes, puis collez-les dans l’onglet Texte.'
    : 'Collez la recette complète, avec les ingrédients et les étapes de préparation.';

export function getAnalysisFeedback(error: unknown, source: AnalysisSource): AnalysisFeedback {
  const typed = error instanceof RecipeAnalysisError ? error.code : null;
  const object = error && typeof error === 'object' ? error as { status?: number; code?: string | number; message?: string } : {};
  const message = typeof object.message === 'string' ? object.message.toLowerCase() : '';
  const status = Number(object.status ?? object.code) || Number(message.match(/\b(400|401|403|404|408|413|429|500|502|503|504)\b/)?.[1]);
  const feedback = (title: string, advice: string, reference: string) => ({ title, advice, reference });
  if (typed === 'SESSION_EXPIRED') return feedback('Votre session a expiré.', 'Reconnectez-vous puis relancez l’analyse. Votre saisie est conservée.', 'IA-SESSION');
  if (typed === 'SOURCE_UNAVAILABLE') return feedback('La page de recette n’a pas pu être récupérée.', nextStep('url'), 'IA-PAGE');
  if (typed === 'NOT_CONFIGURED' || message.includes('api key is not configured')) return feedback('L’analyse IA n’est pas configurée.', 'La saisie manuelle reste disponible. L’administrateur doit configurer l’accès au service IA.', 'IA-CONFIG');
  if (typed === 'MISSING_INPUT') return feedback('La source de la recette manque.', source === 'photo' ? 'Sélectionnez une photo du document à analyser.' : source === 'url' ? 'Renseignez le lien complet de la recette.' : 'Collez les ingrédients et les étapes dans la zone Texte.', 'IA-SOURCE');
  if (typed === 'INVALID_URL') return feedback('Ce lien n’est pas valide.', 'Utilisez une adresse complète commençant par https:// ou http://, ou copiez la recette dans l’onglet Texte.', 'IA-LIEN');
  if (typed === 'INVALID_FILE') return feedback('Cette photo ne peut pas être analysée.', 'Choisissez une photo JPEG, PNG ou WebP de moins de 15 Mo ; elle sera compressée avant l’analyse. Pour un PDF, copiez son texte dans l’onglet Texte.', 'IA-FICHIER');
  if (typed === 'UNREADABLE_FILE') return feedback('Le fichier n’a pas pu être lu.', 'Sélectionnez à nouveau la photo, ou ouvrez-la et enregistrez une nouvelle copie avant de réessayer.', 'IA-LECTURE');
  if (typed === 'NO_RECIPE_FOUND' || message.trim() === 'no_recipe_found') return feedback('Aucune recette complète n’a été détectée.', nextStep(source), 'IA-RECETTE');
  if (typed === 'INCOMPLETE_RESPONSE') return feedback('L’IA a renvoyé une recette incomplète.', `${nextStep(source)} Vous pouvez aussi terminer la saisie manuellement.`, 'IA-INCOMPLET');
  if (typed === 'INVALID_RESPONSE' || error instanceof SyntaxError) return feedback('La réponse de l’IA n’a pas pu être interprétée.', 'Réessayez une fois. Si le problème persiste, utilisez une autre source ou saisissez la recette manuellement.', 'IA-REPONSE');
  if (typed === 'RATE_LIMITED' || status === 429 || /quota|resource_exhausted|rate.?limit|too many requests/.test(message)) return feedback('La limite d’utilisation de l’IA est atteinte.', 'Attendez avant de réessayer. Si le message persiste, l’administrateur doit vérifier le quota du service. Vous pouvez saisir la recette manuellement.', 'IA-QUOTA');
  if (typed === 'PROVIDER_ACCESS' || status === 401 || status === 403 || /api[_ ]key[_ ]invalid|api key not valid|permission_denied|unauthenticated/.test(message)) return feedback('L’accès au service IA est refusé.', 'L’administrateur doit vérifier la clé et les autorisations du service. Vous pouvez continuer avec une saisie manuelle.', 'IA-ACCES');
  if (typed === 'ANALYSIS_TIMEOUT' || status === 408 || status === 504 || /timeout|timed out|deadline_exceeded/.test(message)) return feedback('L’analyse a pris trop de temps.', 'Réessayez avec une photo plus légère ou le texte de la recette. Si le problème persiste, réessayez plus tard.', 'IA-DELAI');
  if (typed === 'SERVICE_UNAVAILABLE' || status >= 500 && status <= 599 || /unavailable|overloaded/.test(message)) return feedback('Le service IA est temporairement indisponible.', 'Réessayez dans quelques minutes, ou continuez la saisie manuellement.', 'IA-SERVICE');
  if (/failed to fetch|network|load failed|fetch failed|offline/.test(message)) return feedback('La connexion au service IA a échoué.', 'Vérifiez votre connexion Internet puis réessayez. Votre saisie est conservée.', 'IA-RESEAU');
  if (typed === 'RESPONSE_BLOCKED' || /safety|blocked|recitation|prohibited_content|no candidates/.test(message)) return feedback('Le service IA n’a pas fourni de réponse exploitable.', `Essayez avec un document contenant uniquement la recette. ${nextStep(source)}`, 'IA-BLOCAGE');
  if (status === 413) return feedback('Le document est trop volumineux pour le service IA.', 'Réduisez la taille de la photo ou collez le texte de la recette.', 'IA-TAILLE');
  if (status === 404) return feedback('Le service d’analyse demandé est introuvable.', 'L’administrateur doit vérifier la configuration du modèle IA. La saisie manuelle reste disponible.', 'IA-MODELE');
  if (status === 400) return feedback('Le service IA n’a pas accepté cette demande.', `Essayez une autre source. ${nextStep(source)} Si cela se reproduit, signalez la référence ci-dessous à l’administrateur.`, 'IA-DEMANDE');
  return feedback('La recette n’a pas pu être analysée.', `${nextStep(source)} Si le problème persiste, réessayez plus tard ou saisissez la recette manuellement.`, 'IA-INCONNU');
}

const ingredient = z.object({ name: z.string().trim().min(1), quantity: z.number().finite().nonnegative(), unit: z.string() });
const recipeSchema = z.object({
  title: z.string().optional(), description: z.string().optional(),
  prepTimeMinutes: z.number().finite().nonnegative().optional(), cookTimeMinutes: z.number().finite().nonnegative().optional(),
  servings: z.number().finite().positive().optional(), difficulty: z.string().optional(),
  ingredients: z.array(ingredient).min(1),
  instructions: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1)]),
  tags: z.array(z.string()).optional(), imageUrl: z.string().optional(), image_url: z.string().optional(),
});
export function parseAnalyzedRecipe(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  if (cleaned === 'NO_RECIPE_FOUND') throw new RecipeAnalysisError('NO_RECIPE_FOUND');
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch { throw new RecipeAnalysisError('INVALID_RESPONSE'); }
  const result = recipeSchema.safeParse(parsed);
  if (!result.success) throw new RecipeAnalysisError('INCOMPLETE_RESPONSE');
  return result.data as AnalyzedRecipe;
}
