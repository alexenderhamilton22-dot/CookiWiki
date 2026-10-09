# CookiWiki → Mealio : compatibilité et chantier proposé

## Ce que conserve cette livraison

- Table `recipes`, identifiants et routes `/recette/:id`.
- Noms des champs actuels, dont `title`, `ingredients`, `instructions`, `servings`, `prep_time`, `cook_time`, `tags` et `image_url`.
- Ingrédients en lignes `{ name, qty, unit }`. La quantité reste un nombre ; l’unité et le libellé restent des textes.
- Instructions sous forme de texte, même avec l’éditeur par étapes.
- Quantités de base enregistrées : ajuster les parts sur la fiche est un calcul d’affichage.
- Restauration d’une recette avec son ID d’origine, pour les liens déjà présents dans Mealio.

Les nouvelles tables de favoris et versions sont indépendantes de la lecture des recettes. Cette livraison ne modifie aucun fichier, paramètre ou schéma Mealio.

## Proposition côté Mealio

1. **Contrôler le contrat de lecture.** À partir de quelques vrais IDs, vérifier la lecture de CookiWiki, l’ouverture du détail et la présence des champs. Une recette supprimée doit être signalée comme indisponible, sans casser le planning ni les autres recettes. Après restauration, son lien doit fonctionner à nouveau.
2. **Conserver la ligne originale.** Dans le traitement des ingrédients, garder `name`, `qty` et `unit` d’origine à côté du résultat de rapprochement. Cela permet de comprendre et corriger une association sans perdre la formulation de la recette.
3. **Ne pas inventer les conversions.** Les synonymes, mots à ignorer et conversions restent dans les tables de paramètres Mealio. Une unité sans conversion ou une quantité absente doit être signalée comme non calculable, pas transformée en zéro disponible, en grammes ou en produit manquant par défaut.
4. **Tester les portions de bout en bout.** Recipe.servings constitue la base ; Mealio applique le ratio une seule fois pour le planning et les achats. Ne pas reprendre une quantité déjà multipliée à l’écran de CookiWiki.
5. **Traiter les alternatives explicitement.** « Parmesan et/ou fromage râpé » ou « crevettes ou gambas » ne doit pas obliger à acheter les deux. Le choix appartient au parcours et au matcher Mealio ; il ne faut pas remplacer ces formulations par une certitude côté CookiWiki.

## Cas de recette à contrôler

| Cas | Attendu |
|---|---|
| 0,25 litre pour 4 parts, planifié pour 2 | 0,125 litre, une seule multiplication |
| 1/2 sachet saisi comme 0,5 sachet | Nombre conservé ; poids seulement si conversion paramétrée |
| Sel sans quantité (`qty = 0`) | Quantité non précisée ; aucune quantité inventée |
| Un bol de sauce tomate | Unité conservée ; conversion non calculable si absente |
| Deux lignes d’un même ingrédient | Lignes originales conservées ; regroupement contrôlé dans Mealio |
| Ingrédient facultatif ou alternative | Choix explicite avant d’ajouter aux courses |
| Recette avec instructions anciennes | Lecture identique ; l’éditeur par étapes ne change pas les champs |
| ID d’une recette mise en corbeille | Message indisponible, sans erreur globale du planning |
| Même recette restaurée | Même ID et même route |

Le premier lot proposé est donc un contrôle de lecture et de calcul sur 5 à 10 recettes réelles, puis la mise à niveau des paramètres là où ce contrôle révèle des écarts. Le perfectionnement du matcher reste un chantier distinct ; aucune nouvelle conversion automatique ni refonte de celui-ci n’a été introduite ici.
