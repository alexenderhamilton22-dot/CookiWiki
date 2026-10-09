# CookiWiki V1.3 — nouveautés

L’accueil affiche maintenant un badge de version (v1.3.0). Vite reprend la valeur de `package.json` lors du démarrage ou du build ; aucune variable supplémentaire n’est à configurer. Pour une prochaine version, modifier `package.json`, puis reconstruire/redéployer.

## Chargement et maintenance

Tailwind passe de 3 à 4. Le plugin Vite remplace l’ancien PostCSS ; les couleurs, rayons personnalisés et animations sont conservés. Les classes d’ombres, flou et contours sont adaptées aux changements de noms. Le moteur de fusion des classes passe à Tailwind Merge 3.

L’éditeur, la fiche, la connexion, la corbeille et l’historique sont chargés à leur ouverture. La compression photo est chargée uniquement pour une photo. Les bibliothèques React et Supabase sont séparées pour leur mise en cache. Le JavaScript initial total passe d’environ 860 Ko à 690 Ko (261 à 209 Ko gzip). Le fichier d’entrée seul est autour de 227 Ko : les autres fichiers initiaux restent nécessaires et sont inclus dans le total. Le CSS est autour de 75 Ko (13 Ko gzip).

## Instructions et cuisine

L’éditeur conserve le texte complet par défaut et propose des blocs d’étapes réordonnables avec des boutons utilisables au toucher. Les instructions continuent d’être enregistrées dans le champ texte `instructions`, pour préserver les anciennes recettes et la lecture Mealio. Ouvrir l’éditeur ne réécrit pas la recette. La transformation en texte numéroté intervient lorsqu’un bloc est modifié ou réordonné.

En mode cuisine, chaque étape a une case de progression, avec compteur et bouton Recommencer. La progression reste temporaire ; sortir du mode cuisine ne la supprime pas, un rechargement la réinitialise.

Le maintien de l’écran actif est conservé pendant la consultation, y compris en mode cuisine. Les transitions de visibilité et la libération du verrou écran sont contrôlées ; un verrou obtenu après fermeture est libéré.

Les boutons de portions existants restent présents, avec cibles tactiles de 44 px. L’affichage conserve jusqu’à trois décimales et utilise la virgule française. Une quantité 0 déjà utilisée pour une quantité absente est affichée « — », sans inventer une valeur ni un sens « au goût ». Les ingrédients enregistrés ne sont pas modifiés par le changement de portions.

## Bibliothèque

Total général à l’accueil ; panneau Répartition avec comptes par tag/catégorie et auteur. Le schéma ne possède pas de catégorie séparée : les tags existants servent de classement, et une recette peut appartenir à plusieurs groupes. Une recette ne compte qu’une fois dans un même tag. Les auteurs sont séparés du classement et les recettes sans tag/catégorie sont comptées.

La lecture de bibliothèque utilise plusieurs pages pour dépasser la limite d’une réponse Supabase : le total n’est plus limité aux premières recettes.

Favoris privés par compte, synchronisés entre appareils. Consultations récentes également enregistrées par compte. Les recettes restent publiques et partagées. Avec les mêmes identifiants familiaux, favoris et consultations sont partagés par les membres.

## Historique et corbeille

La migration ajoute des snapshots immuables avant chaque modification ou suppression. Le navigateur ne peut pas écrire ou falsifier ces archives. L’historique propose de consulter et restaurer les 20 dernières versions. Une restauration concurrente est refusée si `updated_at` a changé depuis l’ouverture de la fiche.

La suppression depuis l’application passe par une fonction exigeant la migration. La recette supprimée est archivée dans la même transaction. La corbeille montre les recettes récupérables parmi les 100 dernières suppressions, en masquant celles déjà restaurées. Une restauration garde l’identifiant d’origine et n’écrase pas une recette existante portant ce même ID.

L’archive couvre la recette, pas les commentaires ni les favoris supprimés en cascade. Les fichiers photo restent dans le stockage. Les politiques d’écriture existantes sur `recipes` continuent d’être appliquées ; aucun assouplissement global de RLS n’est fourni.

## Validation

138 tests couvrent les parcours existants, le chargement Node ESM de l’import par lien, les étapes, les quantités, les compteurs, la lecture de plus de 1 000 recettes et le maintien de l’écran actif. PostgreSQL embarqué vérifie la migration réexécutable, l’isolation entre comptes, les snapshots, les restaurations, les conflits et les refus RLS.

Les tests PostgreSQL utilisent une structure représentative, pas la base réelle. Aucun déploiement ni changement sur votre Supabase n’a été exécuté. Les vérifications visuelles sur téléphone restent à faire : l’environnement ne disposait pas d’un navigateur utilisable pour les captures. Suivre `INSTALLATION.md` avant mise en production.
