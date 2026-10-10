# Correctif 1.3.1 — commentaires

La table Supabase `public.comments` utilise `user_id`, et non `author_id`. Le formulaire envoie maintenant `user_id` et reconnaît le commentaire de l’utilisateur connecté avec ce même champ. Les champs nullable du schéma fourni sont pris en compte.

Le message « Votre texte est conservé » apparaît en couleur neutre, séparé de l’erreur. Le texte reste disponible pour réessayer.

Validation locale : 139 tests réussis, vérification TypeScript, lint sans erreur (8 avertissements existants) et build de production.

Aucune migration SQL n’est nécessaire pour cette correction. La version affichée sur l’accueil passe à v1.3.1.

Après remplacement des fichiers :

```powershell
npm ci
npm run verify:production
git add .
git status
git commit -m "Fix comments user_id schema and retained text message"
git push
```

Après le déploiement Vercel, vérifier la version v1.3.1 sur l’accueil, puis publier un commentaire avec un compte connecté. L’enregistrement sur votre base réelle reste à valider : les contrôles locaux ne vérifient pas ses politiques RLS.
