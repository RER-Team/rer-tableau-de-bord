# Plan : Plateforme éditoriale RER – Tableau de bord V2

## 1. Analyse du fichier BDD et structure du repo

### 1.1 Fichier Documentation initiale/BDD articles Le Mutualiste - RER.xlsx

**Feuille 1 – « Réponses au formulaire 2 » (articles)**  
~742 lignes de données (1 en-tête). Colonnes identifiées :


| Colonne | Libellé                          | Usage dans la nouvelle BDD                                                   |
| ------- | -------------------------------- | ---------------------------------------------------------------------------- |
| A       | Code article                     | `code_article` (ex. ART_2026-02 …)                                           |
| B       | Horodateur                       | `horodateur` / `date_depot` (numérique Excel → date)                         |
| C       | Adresse e-mail OLD               | Optionnel / migration                                                        |
| D       | Titre                            | `titre`                                                                      |
| E       | Chapô                            | `chapo`                                                                      |
| F       | Texte                            | `contenu` (texte brut / HTML)                                                |
| G       | Auteur                           | Lien vers table `auteurs` (Prénom NOM)                                       |
| H       | Prénom                           | Redondant si auteur lié                                                      |
| I       | Mutuelle                         | Lien vers table `mutuelles`                                                  |
| J       | Rubrique                         | Lien vers table `rubriques`                                                  |
| K       | Légende photo                    | `legende_photo`                                                              |
| L       | Post Réseaux sociaux             | `post_rs` (texte prêt à publier)                                             |
| M       | Lien de la photo                 | `lien_photo` → à terme URL upload interne                                    |
| N       | Format d'article                 | Lien vers table `formats`                                                    |
| O       | Etat de l'article                | `etat` (enum ou table `etats`)                                               |
| P       | Email                            | Redondant si auteur lié                                                      |
| Q       | Photo miniature                  | Optionnel / dérivé                                                           |
| R       | Nombre de signes                 | `nombre_signes` (optionnel)                                                  |
| S–V     | Lien article / html / rtf / Word | Migration uniquement ; en production, affichage et exports sur la plateforme |
| W–X     | Lien correction                  | Optionnel (workflow actuel Google Form, à ne pas reproduire)                 |
| Y       | Id article                       | `id_article` / id Google Doc pour migration uniquement                       |


**Valeurs observées (échantillon)**  

- **États :** « A relire », « Mettre à jour », « Relu ». À aligner avec le workflow cible : **à relire → corrigé → validé → publié**.  
- **Formats :** Actus, Article, Brève, Courrier des lecteurs, Dossier, Filet, Focus.  
- **Rubriques :** Actu santé, Actu vie pratique, Médecine, Métier, Politique de santé, Produits et services, Protection sociale, Prévention, Santé, Société, Vie de la mutuelle, Vie pratique.  
- **Mutuelles :** Acoris Mutuelles, Avenir Mutuelle, MBA Mutuelle, MPPM, Mutuelles du Soleil, Pavillon Prévoyance, RER, Viasanté, etc.

**Feuille 2 – « Infos mutuelles et rédacteurs »**  
Liste des rédacteurs : Prénom NOM (A), Prénom (B), NOM (C), Email (D), Mutuelle (E), Lien formulaire personnalisé (F), rubriques (H), formats (I). ~1000 lignes (dont lignes vides / « Sélectionnez votre nom »). À importer en tables `auteurs` et `mutuelles` (dédupliquées).

**Feuille 3 – « editResponseUrl »**  
Horodateur + URL d’édition Google Form. Utilisable uniquement pour la migration (correspondance ancien formulaire ↔ enregistrement), pas à reproduire comme entité métier.

### 1.2 Structure actuelle du repo

Le dépôt contient notamment :

- **Documentation initiale/** : xlsx, captures Looker, PDF proposition.
- **docs/** : plan (ce fichier), suivi (SUIVI.md).

---

## 2. Schéma de base de données (adapté à la stack)

Le xlsx sert de **référence métier** ; le schéma final est **choisi en fonction de la stack** (voir section 3).

### 2.1 Entités à refléter

users, organizations/mutuelles, articles, **article_versions**, **comments**, **exports**, **notifications**, **audit_log** ; champs articles : titre, auteur(s), date, mutuelle, rubrique, format, statut, contenu, résumé/chapo, nb_signes, lien image, post RS. **Index** sur colonnes de recherche et filtres. Table **formats** avec champ optionnel **signes_reference** pour le guidage du rédacteur.

### 2.2 Variantes

- **Option A – Next.js + Prisma + PostgreSQL (OVH)** : schéma classique, Prisma, auth custom ou NextAuth.
- **Option B – Supabase** : auth.users + profiles, RLS, Storage pour photos.
- **Option C – Drizzle** : même logique, migrations SQL explicites.

Recommandation par défaut : Supabase pour la Phase 1 (vélocité), code prêt pour migration OVH si besoin.

---

## 3. Stack technique et hébergement

- **Front :** Next.js 14+ (App Router), TypeScript.
- **Back :** API routes Next.js ; BDD PostgreSQL (Supabase ou OVH).
- **Auth :** email/mot de passe, sessions, rôles (Admin, Relecteur, Auteur, Lecteur option).
- **Stockage :** Supabase Storage ou OVH S3-compatible (upload natif, « Télécharger photo »).
- **Variables d’environnement :** `DATABASE_URL`, secret auth, `STORAGE_*`, `SMTP_*`, webhook email si ingestion.

---

## 4. Architecture cible du repo

```
├── Documentation initiale/
├── docs/           # plan.md, SUIVI.md, doc technique/utilisateur
├── scripts/        # import-xlsx-to-db
├── src/ ou app/    # Next.js : app/, components/, lib/, types/
├── prisma/         # schema, migrations (si Prisma)
├── .env.example
├── package.json
└── README.md
```

---

## 5. Phasage fonctionnel

### Phase 1 (MVP)

- **Explorer la base** : liste + preview (drawer/panneau) + lecture ; recherche plein texte ; filtres (période, rubrique, format, auteur, état, mutuelle, post RS, nb signes) ; tri + pagination ; « Réinitialiser les filtres ».
- **Dépôt (3 modes)** : saisie directe, import Word .docx, dépôt par email (Phase 2). Sélection auteur existant. **Guidage signes** : afficher nombre de signes de référence selon le format choisi + compteur en temps réel. **Photos** : upload natif (drag & drop), stockage interne, « Télécharger photo ».
- **Workflow** : À relire → Corrigé → Validé → Publié. Relecteur/Admin : éditer, commenter, demander modifs. Historique versions + diff + traçabilité. Bouton « Corriger ».
- **Exports** : Word, HTML, Texte, Markdown (PDF optionnel). Bloc « Post RS » éditable + bouton « Copier ». Lien Google Doc optionnel (migration).
- **RBAC** : matrice permissions (voir / éditer / publier). Auth email/mot de passe.
- **Migration** : import xlsx, mapping documenté, rapport d’import (erreurs, champs manquants), users si email sinon auteur libre, conserver date/statut.

### Phase 2

IA (relecteurs/admin, extensible ; jamais publié sans validation humaine), notifications email (accusé dépôt, demande modifs, validé, publié), tableau de bord analytics (pipeline statuts, répartitions, exports stats), ingestion email (webhook Mailgun/Postmark/Sendgrid).

---

## 6. Design et UX

- Tout sur la plateforme (pas de dépendance Google Docs). Identité RER, titre « Banque de contenus », baseline « Cherchez, lisez, téléchargez, publiez sur votre site ! ».
- **UX :** moderne, flat, agréable, très efficace (1–2 clics pour actions principales, listes scannables, filtres accessibles). Responsive, accessibilité, performance (pagination/virtualisation), feedback clair.

---

## 7. Non-fonctionnel

Sécurité (RBAC, XSS éditeur, rate limiting, audit logs), GDPR (minimisation, export, suppression, rétention), performance (cache exports, recherche indexée), observabilité (logs, erreurs), qualité (tests unit + e2e, lint, typecheck).

---

## 8. Livrables

- **Plan et suivi dans le repo** : ce fichier (`docs/plan.md`) + `docs/SUIVI.md` pour l’avancement et les tests locaux.
- **Livrables immédiats** : spec fonctionnelle, schéma BDD + mapping xlsx, contrats API, plan UI, script d’import, recommandation OVH vs Supabase, démarrage code (Next.js, auth, layout, page Explorer).
- **Fin Phase 1** : app déployée, comptes de test, doc utilisateur et technique.

---

## 9. Méthode de travail (sprints)

- **Étape par étape** : Sprint 1 → 2 → 3 → 4 → 5. À chaque fin d’étape/sprint : **test en serveur local** (`npm run dev`) avant de continuer.
- **Sprint 1** : projet, BDD, migrations, seed, import xlsx. Test local : données consultables.
- **Sprint 2** : auth, rôles. Test local : connexion par rôle, droits.
- **Sprint 3** : liste, détail, upload photo, dépôt saisie. Test local : navigation + dépôt avec photo.
- **Sprint 4** : import Word, relecture (édition, états, historique), exports. Test local : cycle complet.
- **Sprint 5** : UI/UX, déploiement, doc. Test local : vérification finale avant déploiement.

Phase 2 : même principe sprint par sprint après validation Phase 1.

---

## 10. Ordre de mise en œuvre

1. Initialiser le projet (stack, BDD, .env).
2. Schéma BDD + seed référentiels (états, rubriques, formats, mutuelles avec signes_reference).
3. Script d’import xlsx (rapport d’import).
4. Auth et rôles.
5. Pages et API (liste, détail, dépôt, relecture, historique).
6. Exports.
7. UI/UX.
8. Déploiement et doc.
