import { existsSync } from 'node:fs';

const required = ['api/analyze-recipe.ts', 'server/analyze.ts', 'server/source.ts', 'src/lib/recipeAnalysis.ts', 'vercel.json', 'tsconfig.api.json'];
const missing = required.filter((file) => !existsSync(new URL(`../${file}`, import.meta.url)));
if (missing.length) {
  console.error(`Déploiement incomplet : fichiers manquants :\n${missing.map((file) => `- ${file}`).join('\n')}`);
  console.error('Copiez les sources complètes puis ajoutez aussi les dossiers api/ et server/ au commit Git.');
  process.exit(1);
}
