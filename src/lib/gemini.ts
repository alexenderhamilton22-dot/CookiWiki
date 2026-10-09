import { supabase } from './supabase';
import { parseAnalyzedRecipe, RecipeAnalysisError, type AnalysisErrorCode } from './recipeAnalysis';
import type { AnalyzedRecipe } from '../types/analysis';
export type { AnalyzedIngredient, AnalyzedRecipe, Difficulty } from '../types/analysis';

async function analyze(payload: object): Promise<AnalyzedRecipe> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new RecipeAnalysisError('SESSION_EXPIRED');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch('/api/analyze-recipe', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    // A deployment routing problem must not be presented as a valid recipe.
    if (!response.headers.get('content-type')?.includes('application/json')) {
      if (response.status === 413) throw new RecipeAnalysisError('INVALID_FILE');
      throw new RecipeAnalysisError('SERVICE_UNAVAILABLE');
    }
    const result = await response.json();
    if (!response.ok) {
      const codes: AnalysisErrorCode[] = ['NOT_CONFIGURED', 'NO_RECIPE_FOUND', 'INVALID_RESPONSE', 'INCOMPLETE_RESPONSE', 'UNREADABLE_FILE', 'INVALID_FILE', 'INVALID_URL', 'MISSING_INPUT', 'SESSION_EXPIRED', 'RATE_LIMITED', 'PROVIDER_ACCESS', 'SERVICE_UNAVAILABLE', 'ANALYSIS_TIMEOUT', 'SOURCE_UNAVAILABLE', 'RESPONSE_BLOCKED'];
      const code = result?.error?.code;
      if (codes.includes(code)) throw new RecipeAnalysisError(code);
      throw new Error(`Analysis HTTP ${response.status}`);
    }
    return parseAnalyzedRecipe(JSON.stringify(result.recipe));
  } catch (error) {
    if (controller.signal.aborted) throw new RecipeAnalysisError('ANALYSIS_TIMEOUT');
    throw error;
  } finally { clearTimeout(timer); }
}

export async function analyzeRecipeImage(file: File): Promise<AnalyzedRecipe> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024 || !file.size) throw new RecipeAnalysisError('INVALID_FILE');
  const { default: imageCompression } = await import('browser-image-compression');
  const compressed = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: true });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reader.onabort = () => reject(new RecipeAnalysisError('UNREADABLE_FILE'));
    reader.readAsDataURL(compressed);
  });
  return analyze({ source: 'photo', mimeType: compressed.type, image: dataUrl.split(',')[1] });
}
export const analyzeRecipeUrl = (url: string) => analyze({ source: 'url', url });
export const analyzeRecipeText = (text: string) => analyze({ source: 'text', text });
