export function formatRecipeQuantity(quantity: number, ratio = 1): string {
  if (!Number.isFinite(quantity) || quantity <= 0) return '—';
  const scaled = quantity * ratio;
  if (scaled > 0 && scaled < 0.001) return '< 0,001';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(scaled);
}
