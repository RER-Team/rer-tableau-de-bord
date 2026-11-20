# CLAUDE.md — Mémo projet (RER tableau de bord V2)

Ce fichier compile l'essentiel utile pour travailler vite sur le projet, sans relire toute la documentation historique.

## 1) Références prioritaires (ordre recommandé)

- `PRODUCT.md` : vision produit, rôles, principes UX, contraintes d'accessibilité.
- `DESIGN.md` : design system (palette, composants, règles Do/Don't).
- `docs/utilisation.md` : parcours fonctionnels (connexion, contenus, dépôt, relecture, exports).
- `docs/deploiement.md` : variables d'environnement, checklists et procédures de déploiement.

## 2) Docs secondaires (contexte / historique)

- `docs/SUIVI.md` : historique des sprints, décisions et avancement.
- `docs/plan.md` : plan initial et architecture cible (utile pour contexte, moins fiable pour l'état actuel).
- `docs/notifications-deploiement-v1.md` : checklist dédiée notifications.
- `docs/performance-mesure.md` : méthode de mesure perf (alpha/prod).
- `TRANSFER/*.md` : notes de transfert internes (à utiliser avec prudence).

## 3) Produit en bref

- Application de banque de contenus pour le Réseau des Éditeurs de Revues.
- Rôles principaux :
  - `auteur` : dépôt/rédaction
  - `relecteur` : correction/validation
  - `admin` : pilotage (référentiels, utilisateurs, stats)
- Parcours central : rechercher -> lire -> corriger -> valider/publier -> exporter.

## 4) Pages et parcours clés

- `"/articles"` : vue principale (Explorer, Cartes, Tableau), filtres et recherche.
- `"/articles/depot"` : création de contenu + import Word.
- `"/admin/articles"` : file de relecture et édition.
- `"/articles/[id]"` : lecture plein écran + exports.
- `"/decouvrir"` : vitrine publique (visiteurs non connectés).

## 5) API clés à connaître

- Liste contenus : `GET /api/articles`
- Facettes filtres : `GET /api/articles/facets`
- Détail article : `GET /api/articles/[id]`
- Export : `GET /api/articles/[id]/export?format=txt|html|word`
- Téléchargement image : `GET /api/articles/[id]/download-image`

Notes d'accès :
- Le mode public passe par `scope=public` et ne doit exposer que du publié coché « vitrine » (`isExemplePublic`), utilisé par `/decouvrir`.
- La liste connectée (`/articles`) charge ses pages suivantes avec `scope=app` : utilisateur connecté requis, pas de restriction vitrine, état forcé à « publié » pour les non-éditeurs. Ne pas y renvoyer `scope=public`, sinon la pagination s'arrête à la première page.
- Les URL de pagination des vues (`ArticlesCardsExplorer`, `ArticlesCardsView`, `ArticlesTableView`) doivent reprendre tous les filtres de la page, y compris `auteurId`.
- Exposants des ordinaux (`lib/ordinals.ts`) : appliqués à l'affichage (`renderArticleHtml`, composant `OrdinalText`) et aux exports HTML/Word, jamais au stockage, pour garder la recherche texte intacte. Toute nouvelle vue de lecture doit passer par ces helpers.
- Les routes privées restent protégées par authentification/rôles.

## 6) Environnement et secrets (minimum)

Voir `docs/deploiement.md` pour la liste complète. Variables critiques :

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (ou `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`)
- variables e-mail (`MAIL_PROVIDER`, `MAIL_FROM`, etc.) selon le provider

## 7) Commandes utiles

- Dev : `npm run dev`
- Build : `npm run build`
- Tests : `npm run test`
- Prisma client : `npm run db:generate`
- Migrations : `npm run db:migrate` (dev) / `prisma migrate deploy` (prod)
  - Historique `_prisma_migrations` de prod réaligné le 20/11/2026 (toutes les migrations du dossier y figurent). Une migration appliquée à la main (SQL Editor) doit ensuite être marquée avec `prisma migrate resolve --applied <nom>`, sinon `migrate deploy` tentera de la rejouer.
  - `20240220000000_baseline` est la migration de départ : elle crée le schéma de base (Mutuelle, Rubrique, Format, Etat, Auteur, Article, ArticleHistorique, User) tel qu'avant `add_article_blocs`. `20240221000000_init` est un fichier de remplacement sans SQL, à ne pas modifier (son empreinte est enregistrée en prod). Une base vierge se crée avec `prisma migrate deploy` ; vérifier ensuite `prisma migrate diff --from-url <base> --to-schema-datamodel prisma/schema.prisma --exit-code` (code 0 = identique).
- Seed : `npm run db:seed`

## 8) Règles de travail recommandées

- Réutiliser les composants existants plutôt que recréer des variantes UI.
- Respecter la sémantique couleur :
  - orange = action principale
  - bleu = actif/sélection
- En cas de changement API public/privé, vérifier :
  - middleware/proxy
  - contrôle d'accès côté route
  - tests associés
- Après changement substantiel :
  - build local
  - test ciblé
  - vérification manuelle des flux critiques (`/articles`, `/admin/articles`, `/decouvrir`).

## 9) État actuel à garder en tête

- `"/decouvrir"` doit offrir une expérience proche d'un lecteur classique :
  - filtres
  - vues Explorer/Cartes/Tableau
  - lecture article
  - exports
- Le déploiement CI/CD sur `develop` se déclenche uniquement sur nouveau commit poussé.

## 10) Dette doc / maintenance

À mettre à jour après évolutions majeures :

- `docs/utilisation.md` pour les flux UI/UX visibles des utilisateurs.
- `docs/deploiement.md` si variable, provider ou procédure changent.
- ce `claude.md` (section "État actuel") pour refléter les décisions récentes.

---

Si conflit entre documents :
1. faire confiance au code en place,
2. puis à `docs/utilisation.md` / `docs/deploiement.md`,
3. puis aux docs historiques (`SUIVI`, `plan`).
