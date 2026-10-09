# CookiWiki V1.3 — installation et validation

Cette archive contient le projet complet. Sauvegardez les sources et la base Supabase avant l’installation. Conservez `.env.local` et les variables Vercel actuelles.

## 1. Installer la migration des nouveautés

Dans l’éditeur SQL du projet **CookiWiki**, exécutez intégralement :

`supabase/migrations/20261009_recipe_library.sql`

Elle ajoute les favoris et consultations par compte, les snapshots de recettes et les fonctions de corbeille/restauration. Elle n’altère ni les colonnes ni les règles RLS existantes de `recipes`. Un trigger conserve la recette précédente lors des mises à jour et suppressions. Les anciennes versions antérieures à l’installation ne sont pas récupérables.

Le script a été testé dans PostgreSQL local avec un schéma représentatif, pas dans votre Supabase réel. Les colonnes qu’il utilise sont celles déjà écrites par l’application, dont `updated_at` et `last_modified_by`. Si le script échoue, sa transaction annule ses changements : vérifiez votre schéma avec `docs/DIAGNOSTIC_SUPABASE.sql` avant de le modifier.

La migration `20261008_recipe_analysis_limit.sql` de la V1.2 reste nécessaire pour l’IA. Si vous l’avez déjà exécutée, ne la réexécutez pas pour ces nouveautés.

Favoris et consultations sont privés par compte Supabase ; avec un compte familial partagé, les membres partagent également ces listes. L’historique et la corbeille sont accessibles aux comptes connectés. Les restaurations respectent les autorisations existantes sur les recettes.

Sans la nouvelle migration, les recettes et l’import IA restent accessibles ; les favoris/historiques signalent leur indisponibilité et la suppression depuis l’application est bloquée pour éviter une suppression sans archive.

## 2. Conserver les variables

| Variable | Usage |
|---|---|
| `VITE_SUPABASE_URL` | URL de CookiWiki, publique |
| `VITE_SUPABASE_ANON_KEY` | Clé publique anon CookiWiki |
| `GEMINI_API_KEY` | Clé Gemini, serveur uniquement |
| `GEMINI_MODEL` | Modèle serveur ; défaut `gemini-flash-latest` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Facultatives ; le serveur utilise sinon les variables VITE correspondantes |

Aucune nouvelle clé n’est nécessaire. Ne pas remettre la clé Gemini dans une variable VITE, ni une clé service-role dans le navigateur.

## 3. Installer et contrôler

Node.js **22.12 minimum**. Copiez tous les fichiers de l’archive, y compris `postcss.config.js`, `tailwind.config.ts`, `vite.config.ts`, les sources et le lockfile. Le fichier PostCSS vide fourni remplace l’ancien plugin Tailwind 3 ; la compilation Tailwind 4 passe maintenant par Vite.

```sh
npm ci
npm run verify:production
npm audit
npm run dev
```

Les tests incluent un PostgreSQL embarqué pour les migrations ; aucune connexion à votre base n’est utilisée. Le script contrôle tests, TypeScript, lint et build. Les huit avertissements Fast Refresh existants ne sont pas des erreurs. Des avertissements de dépréciation de dépendances peuvent encore apparaître indépendamment de l’audit de vulnérabilités.

`npm run dev` exécute l’API d’analyse locale. `npm run preview` est statique et n’exécute pas cette API. Après validation locale, redéployez sur Vercel pour mettre à jour les sources, fonctions et styles.

Tailwind 4 demande un navigateur récent : Safari 16.4+, Chrome 111+ ou Firefox 128+. Vérifiez les téléphones utilisés par la famille. Référence : https://tailwindcss.com/docs/upgrade-guide

## 4. Recette des nouveautés sur téléphone

1. Vérifier l’accueil à 360–390 px : total visible, recherche, favoris/récents et panneau Répartition ; les listes de tags ne repoussent pas toutes les cartes.
2. Ouvrir les tags et comparer quelques compteurs avec les recettes affichées. Une recette portant plusieurs tags compte dans plusieurs catégories ; leurs nombres ne s’additionnent pas au total.
3. Ajouter/retirer un favori, recharger, puis ouvrir avec le même compte sur un autre appareil. Un autre compte doit avoir sa propre liste.
4. Ouvrir deux recettes puis revenir à « Consultées récemment » : la dernière consultée est en tête.
5. Modifier une ancienne recette : l’ouverture ne transforme pas ses instructions. Passer à « Éditer par étapes », déplacer/ajouter/supprimer un bloc, enregistrer puis vérifier le texte complet.
6. Vérifier une analyse IA et un brouillon repris dans l’éditeur d’étapes.
7. Passer en mode cuisine, cocher une étape, quitter temporairement le mode et revenir : progression conservée. Vérifier **Écran actif**, passer dans une autre application puis revenir. Le maintien dépend de l’autorisation du navigateur et des restrictions du système, comme auparavant.
8. Ajuster les parts et contrôler notamment 0,25 et 0,125. Les quantités originales en base ne changent pas ; « — » signifie quantité non précisée. Le calcul existant reste proportionnel.
9. Modifier une recette de test puis restaurer sa version précédente depuis Historique. Vérifier titre, ingrédients, étapes et couverture. Si un autre utilisateur a modifié la recette entre-temps, la restauration doit demander un rechargement plutôt qu’écraser silencieusement sa modification.
10. Mettre une recette de test dans la corbeille, la restaurer et vérifier que **son URL et son ID sont identiques**. Les commentaires supprimés en cascade et favoris supprimés avec la recette ne sont pas restaurés. Aucun fichier photo n’est supprimé par cette fonction.
11. Publier un commentaire, remplacer une couverture et recharger : contrôler aussi les parcours existants.
12. Dans Mealio, ouvrir une recette existante et une recette éditée par étapes, puis vérifier les ingrédients et portions. Voir `MEALIO_COMPATIBILITE.md`.

## Limites et entretien

L’historique conserve uniquement les changements après la migration. Le panneau montre les 20 dernières versions ; la corbeille recherche parmi les 100 dernières suppressions. Les archives ne sont pas purgées automatiquement et ne remplacent pas une sauvegarde de base. Les photos sont des références URL : si un fichier est supprimé du stockage indépendamment, la restauration ne le recrée pas.

Les brouillons restent locaux au navigateur, séparés par compte et recette, avec expiration à 14 jours. Les favoris et consultations sont synchronisés via Supabase. La progression cuisine reste temporaire et repart à zéro après rechargement.

## Si Vercel ne trouve pas `api/analyze-recipe`

Le serveur local peut fonctionner avec des fichiers qui ne sont pas suivis par Git. Vercel n’a accès qu’aux fichiers du déploiement. Copiez le projet complet, puis ajoutez également `api/`, `server/`, `scripts/`, la configuration et le lockfile au commit.

```powershell
git add .
git add -f api/analyze-recipe.ts server/analyze.ts server/source.ts
git ls-files api/analyze-recipe.ts server/analyze.ts server/source.ts
git status
git commit -m "Inclure l API et les sources serveur CookiWiki"
git push
```

`git ls-files` doit afficher les trois fichiers. Si ces fichiers sont déjà suivis mais restent introuvables sur Vercel, vérifier dans le projet Vercel la branche, le commit déployé et le Root Directory : il doit correspondre au dossier contenant `package.json`, `vite.config.ts`, `api/` et `server/`.

Vite charge maintenant l’API locale à la demande, sans l’importer lors du chargement de sa configuration. Le script `scripts/check-deployment.mjs` interrompt explicitement le build si des sources serveur indispensables manquent ; un build client réussi sans fonction IA n’est pas accepté comme déploiement complet.
