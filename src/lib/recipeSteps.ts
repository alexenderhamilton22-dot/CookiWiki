/** Preserve unnumbered prose; split only explicit numbered steps or paragraphs. */
export function splitRecipeSteps(value: string): string[] {
  const text = value.trim();
  if (!text) return [];
  if (/^\s*\d+[.)]\s+/m.test(text)) {
    return text.split(/\n(?=\s*\d+[.)]\s+)/).map((part) => part.replace(/^\s*\d+[.)]\s+/, '').trim()).filter(Boolean);
  }
  return text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}
export function joinRecipeSteps(steps: string[]): string {
  return steps.map((step) => step.trim()).filter(Boolean).map((step, index) => `${index + 1}. ${step}`).join('\n\n');
}
