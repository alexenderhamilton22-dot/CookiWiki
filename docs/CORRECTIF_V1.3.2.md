# Correctif 1.3.2 — démarrage de la fonction IA sur Vercel

## Cause observée

Le journal Vercel signale `ERR_MODULE_NOT_FOUND` pour `file:///var/task/server/analyze`. Les imports locaux sans extension fonctionnaient dans Vite/Vitest, mais pas dans les modules JavaScript ESM chargés par Node après compilation. La fonction plantait avant de traiter la requête, avec HTTP 500 et `FUNCTION_INVOCATION_FAILED`.

## Correction

- Extensions `.js` explicites dans les imports de la fonction et de ses dépendances serveur, y compris les types partagés. Les sources restent en `.ts` : TypeScript résout ces imports vers les sources et produit les fichiers `.js`.
- Configuration NodeNext dans le tsconfig racine utilisé pour la fonction. Le frontend conserve son propre mode bundler.
- Nouveau `tsconfig.api.json`, inclus dans `npm run typecheck`, pour contrôler le graphe serveur avec les règles NodeNext.
- Test de démarrage sous Node avec les modules compilés séparément, sans bundling local : il reproduisait exactement l’erreur avant la correction, puis passe après. Le test vérifie des réponses JSON 405/401 sans appel réseau.
- Version affichée sur l’accueil : v1.3.2. Le correctif des commentaires user_id de v1.3.1 est conservé.

## Validation

140 tests réussis dans 20 suites. TypeScript frontend, serveur et API NodeNext OK. Lint sans erreur, 8 avertissements Fast Refresh existants. Build de production réussi. Serveur Vite démarré : accueil HTTP 200, API HTTP 401 attendu sans connexion.

Le déploiement Vercel et un appel réel à Gemini avec votre compte restent à valider après push. Aucune migration SQL ni nouvelle clé API n’est nécessaire pour corriger ce chargement.

## Installation

Copier tous les fichiers du dossier Cookiwiki_V1.3 de cette archive dans le dossier existant du projet. Conserver les fichiers .env locaux.

```powershell
npm ci
npm run verify:production
git add .
git add -f api/analyze-recipe.ts server/analyze.ts server/source.ts
git status
git commit -m "Fix Vercel Node ESM imports for recipe analysis"
git push
```

Dans Vercel, attendre le déploiement du nouveau commit. Vérifier v1.3.2 sur l’accueil, puis relancer une analyse depuis une session connectée. Si une autre erreur apparaît, relever sa référence et le nouveau journal /api/analyze-recipe : le présent correctif cible le crash de chargement observé.
