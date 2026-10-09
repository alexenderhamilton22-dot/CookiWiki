# CookiWiki V1.2.2 — bilan avant production

## Résultat

Les améliorations ergonomiques V1.1 et les erreurs détaillées V1.1.1 sont conservées. Cette version ajoute l’analyse IA côté serveur, la récupération réelle des pages de recettes, une limitation persistante des analyses, les brouillons et la protection des modifications non enregistrées.

Les routes et IDs de recettes ainsi que les champs utilisés par Mealio sont conservés. Aucune modification de votre base réelle ni aucun déploiement n’a été effectué.

## Import IA

Le navigateur appelle `/api/analyze-recipe` avec sa session Supabase. L’API valide le jeton auprès de Supabase avant d’appeler Gemini. La clé est uniquement dans `GEMINI_API_KEY`, côté serveur. Le SDK Gemini navigateur a été retiré. La photo est compressée avant l’envoi ; le serveur contrôle la taille, le type déclaré et la signature du fichier.

Pour un lien, le serveur télécharge réellement la page, privilégie les données structurées Recipe lorsqu’elles existent, puis utilise le texte de l’article ou de la page. Ce contenu est envoyé à l’IA comme source d’extraction. Si le site refuse la lecture, le message propose de copier les ingrédients et étapes dans l’onglet Texte.

Le téléchargement refuse les protocoles non web, les identifiants dans l’URL, les ports non standards et les adresses privées ou réservées. Chaque redirection est vérifiée et l’adresse DNS validée est fixée pendant la connexion. Le nombre de redirections, la taille de page et les délais sont limités.

Les réponses restent contrôlées par un schéma avant de modifier le formulaire. Les erreurs, quotas, blocages et réponses tronquées sont traduits en messages utiles sans renvoyer le message brut du fournisseur. Une analyse seule n’enregistre aucune recette.

La migration fournie ajoute une limite par compte, atomique et persistante : trois demandes par minute calendaire et dix par heure calendaire. Une migration manquante bloque l’import plutôt que de l’ouvrir sans limite. Les quotas sont des limites de demandes, pas une garantie de coût global du compte fournisseur.

## Brouillons et protection

La saisie est conservée localement après modification. Au retour, un bandeau propose Reprendre ou Ignorer ; aucune version n’est appliquée automatiquement. Tant que ce choix n’est pas fait, la saisie est désactivée pour éviter de mélanger deux brouillons.

Les données sont isolées par utilisateur et recette. Un brouillon expire après 14 jours et est supprimé après un enregistrement réussi. La navigation interne utilise une confirmation ; le rechargement et la fermeture utilisent l’avertissement natif lorsque le navigateur l’autorise. Une erreur de stockage local est signalée.

Les brouillons ne sont pas partagés entre appareils. Les fichiers photo de documents non analysés ne sont pas stockés ; ils doivent être sélectionnés à nouveau. Les couvertures envoyées sont conservées sous forme d’URL. Un brouillon d’édition peut correspondre à une version plus ancienne que la recette publiée : relire avant de l’enregistrer.

## Ergonomie déjà livrée

Accueil raccourci, tags dans un panneau filtrable, durée non limitée par défaut, tri par date/titre/temps, recherche exigeant tous les mots et acceptant exclusions, accents et virgules. Couverture indépendante de l’import IA, actions photo visibles sur téléphone, ingredients adaptés aux petits écrans, barre d’enregistrement fixe, erreurs de commentaires conservant le texte et réessai possible.

## Vérifications et limites

Les contrôles locaux couvrent le client et le serveur : erreurs et validation IA, autorisation et quota avant appel fournisseur, extraction de source, filtrage des adresses et redirections, transport navigateur, récupération des brouillons, navigation bloquée, nettoyage après publication, commentaires, formulaire, photos et recherche.

Le build navigateur a été contrôlé avec des marqueurs de clé serveur et de clé historique : aucun marqueur n’est présent. Le serveur Vite local sert l’accueil et retourne un JSON 401 pour une analyse non authentifiée.

121 tests passent. TypeScript client et serveur, lint sans erreur et compilation réussissent. Huit avertissements Fast Refresh préexistants subsistent. Les avertissements Fast Refresh préexistants et la taille du bundle restent des points de maintenance ; ils ne sont pas des tests fonctionnels.

Les appels Gemini et Supabase des tests sont simulés. La migration SQL n’a pas été exécutée ici faute de connexion à votre base ; le contrôle de l’API simule ses résultats. Aucun test visuel sur téléphone ni test de droits réels n’est revendiqué. Suivre la recette de `INSTALLATION.md` sur une prévisualisation avant production.

## Correctif de l’import par lien V1.2.2

Le contrôle des adresses publiques utilisait un import namespace de `ipaddr.js`, module CommonJS. Dans un chargement Node ESM natif, `ipaddr.process` n’est pas exporté sur ce namespace. L’exception était interceptée et toutes les adresses étaient considérées comme non publiques, ce qui pouvait afficher « Ce lien n’est pas valide » sur une URL correcte.

L’import utilise désormais l’export par défaut CommonJS. Une reproduction native Node confirme qu’une adresse publique est reconnue après correction, tandis que les adresses privées restent refusées. Un nouveau test exécute le module compilé dans un processus Node indépendant, avec les dépendances externes, pour couvrir ce que l’interopérabilité Vitest masquait.

Le lien fourni de `lacuisinedannie.20minutes.fr` est également couvert par un test du formulaire. Une résolution DNS interdite ou une redirection vers une adresse privée continue de bloquer le téléchargement, mais signale une page non récupérable (`IA-PAGE`) au lieu d’accuser la syntaxe du lien (`IA-LIEN`). Les 121 tests, TypeScript, lint et build passent.

Le téléchargement réel de ce site depuis l’environnement de test n’a pas pu être vérifié (résolution DNS indisponible). Aucun appel Gemini réel n’a été effectué. Après installation/redéploiement, relancer ce lien avec la configuration et la session réelles.

## Correctif des dépendances V1.2.1

À la suite des 40 alertes remontées par `npm ci`, les dépendances compatibles et le lockfile ont été actualisés. Vite passe à 6.4.4, Vitest à 4.1.11 et React Router à 7.18.4. Le tagueur de composants de développement et le plugin Typography non activé dans la configuration ont été retirés. Le plugin d’animation Tailwind est déclaré comme dépendance de compilation.

Le script de vérification appelle désormais le CLI npm avec Node, sans `shell: true`, afin de supprimer la cause de DEP0190 sous Windows. Le projet demande Node 22.12 minimum. Les 118 tests, TypeScript, lint et build passent avec les nouvelles dépendances. La vérification a été exécutée sous Linux ; le lancement sous Windows reste à confirmer par l’utilisateur.

Audit npm du 8 octobre 2026 : `npm audit --omit=dev` retourne zéro vulnérabilité. L’installation propre `npm ci` réussit avec le nouveau lockfile. L’audit complet retourne 7 alertes au total (5 hautes, 2 modérées), aucune critique. Elles portent sur Tailwind 3 et ses dépendances de compilation : braces, chokidar, micromatch, fast-glob, postcss-nested et postcss-selector-parser. Leur résolution proposée implique Tailwind 4. Cette migration n’a pas été appliquée : les changements de styles et de configuration nécessitent une recette visuelle. Les alertes restent réelles même si ces outils ne sont pas exécutés par l’API de production. Ne pas appliquer `npm audit fix --force` sans contrôler ses migrations majeures.

La taille du bundle et les huit avertissements Fast Refresh subsistent. Les dépréciations de dépendances jsdom concernent les tests. Le succès des contrôles locaux ne valide toujours pas les droits Supabase ni les parcours connectés sur Vercel.

## Avis et suite

La priorité n’est plus d’ajouter de menus. Installer la migration et les variables serveur, valider commentaires/photos/imports avec la base réelle, puis tester quelques recettes depuis Mealio.

Ensuite : éditeur d’étapes réordonnables, favoris, historique ou corbeille, tags regroupés et pagination/recherche serveur pour une grande bibliothèque. Le nom des autres auteurs des commentaires reste « Membre » si aucun profil n’est retourné : la relation de profils doit être confirmée avant une jointure.

Le mode cuisine pourrait réserver l’écran actif à son activation et ajouter une coche des étapes. Le PDF direct reste absent : copier le texte est disponible, mais un extracteur PDF et un parcours OCR sont nécessaires pour rétablir un import fiable.

Pour Mealio, conserver les lignes d’ingrédients originales et tester fractions, unités inconnues, ingrédients répétés, quantités absentes et alternatives. Une extraction structurellement valide n’est pas une preuve d’exactitude culinaire.

## Références techniques

- https://ai.google.dev/api/generate-content
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/project-configuration/vercel-json
