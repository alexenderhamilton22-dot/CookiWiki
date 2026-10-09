# CookiWiki V1.3

Recettes publiques, édition connectée, commentaires et intégration Mealio.

Avant déploiement, lire `docs/INSTALLATION.md` : cette version utilise les variables serveur Gemini et deux migrations SQL (quota IA, favoris/historique/corbeille). Le bilan et les limites de validation sont dans `docs/BILAN_Cookiwiki.md`.

Installer : `npm ci`.
Vérifier : `npm run verify:production`.
Développer avec l’API locale : `npm run dev`.

Les nouveautés sont décrites dans `docs/EVOLUTIONS_V1.3.md`. Les compteurs réutilisent les tags/catégories existants. La compatibilité Mealio est détaillée dans `docs/MEALIO_COMPATIBILITE.md`.
