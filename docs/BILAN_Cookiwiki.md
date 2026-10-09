# CookiWiki V1.3 — bilan avant production

Les améliorations précédentes (couvertures, commentaires, filtres, erreurs IA, API serveur, brouillons et protection de saisie) sont conservées. Cette version ajoute étapes, progression cuisine, précision d’affichage des quantités, compteurs, favoris/récents synchronisés, historique et corbeille.

## Contrôles

- 138 tests sur 19 suites ; TypeScript client/serveur, lint sans erreur et build.
- Huit avertissements Fast Refresh préexistants subsistent.
- `npm ci` réussit depuis le lockfile.
- Audit npm du 9 octobre 2026 : **zéro vulnérabilité**, y compris les outils de développement. La migration Tailwind 4 supprime les sept alertes précédentes.
- JavaScript initial : environ 690 Ko / 209 Ko gzip, contre 860 Ko / 261 Ko gzip en V1.2.2. Tous les chunks JavaScript sont inférieurs à 500 Ko.
- Contrôle des styles générés : palette, conteneur, ombres et animations présents après migration. Ce contrôle ne remplace pas une recette visuelle.
- Migration bibliothèque exécutée dans PostgreSQL embarqué avec rôles, RLS et schéma représentatif. Vérification de la réexécution, isolation des comptes, archivage, conflits et restauration sans changer les IDs.
- Maintien de l’écran actif testé par simulation de Wake Lock, changement de visibilité, mode cuisine et acquisition tardive après fermeture.

## Installation nécessaire

Exécuter `supabase/migrations/20261009_recipe_library.sql` dans CookiWiki. La migration quota IA de V1.2 doit rester installée. Les variables existantes sont conservées. Les favoris, l’historique et la corbeille demandent la nouvelle migration ; une suppression est bloquée si sa fonction n’est pas installée.

L’archivage n’est pas rétroactif. Les commentaires et favoris supprimés en cascade ne sont pas restaurés. Les snapshots de recettes ne sont pas purgés automatiquement. Les droits existants sur les recettes continuent de s’appliquer ; l’archive n’est pas une sauvegarde générale de Supabase.

## Limites de validation

Aucun déploiement, appel Gemini réel ou changement de la base réelle n’a été exécuté dans cette livraison. La migration a été validée sur un schéma représentatif ; votre RLS, vos contraintes et vos types réels restent à vérifier. Les captures dans un navigateur n’ont pas été possibles dans l’environnement : vérifier les styles sur téléphone, particulièrement panneaux, éditeur et mode cuisine.

Tailwind 4 demande un navigateur moderne (voir INSTALLATION). Quelques dépendances annoncent encore une dépréciation ; cela reste un sujet de maintenance distinct des vulnérabilités recensées. Le chargement complet de la bibliothèque reste côté client : les pages évitent un total tronqué, mais une bibliothèque très importante nécessitera une recherche et des compteurs serveur.

Les parcours et limites sont détaillés dans `EVOLUTIONS_V1.3.md` et `INSTALLATION.md`. La proposition Mealio est dans `MEALIO_COMPATIBILITE.md`. Le bilan historique précédent est conservé dans `HISTORIQUE_V1.2.md`.
