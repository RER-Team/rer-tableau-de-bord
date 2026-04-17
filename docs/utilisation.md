# Utilisation – RER Tableau de bord V2

Guide utilisateur pour la base de données de contenus (dépôt, relecture, consultation). À tester en local avec `npm run dev` puis http://localhost:3000.

---

## 1. Connexion

- **URL** : `/login`
- **Comptes de test** (créés par `npm run db:seed`) :
  - **Admin** : admin@rer.local / `rer2025`
  - **Relecteur** : relecteur@rer.local / `rer2025`
  - **Auteur** : auteur@rer.local / `rer2025`

Seuls les utilisateurs connectés peuvent accéder au tableau de bord et aux actions selon leur rôle : toute tentative d’accès direct à une page de l’application redirige automatiquement vers `/login` tant que l’utilisateur n’est pas authentifié.

### 1.1 Mot de passe oublié

- Depuis `/login`, cliquer sur **« Mot de passe oublié ? »**.
- Saisir l’email du compte puis envoyer la demande.
- Un lien de réinitialisation est généré (valide 60 minutes) et envoyé via le mécanisme d’e-mail configuré.
- Ouvrir le lien reçu pour accéder à `/reset-password`, puis définir un nouveau mot de passe (minimum 12 caractères).
- Le formulaire applique une protection anti-abus côté API : fenêtre de 15 minutes, limite de 20 requêtes par IP et 5 requêtes par email.
- Après une réinitialisation réussie, la session du navigateur courant est invalidée et les API protégées rejettent les sessions JWT devenues obsolètes (reconnexion requise).

---

## 2. Navigation et pages principales

- **Page d’accueil (`/`)**  
  - Si l’utilisateur est **Relecteur** ou **Admin** : redirection automatique vers la file de relecture `/admin/articles?etat=a_relire`.  
  - Sinon (Auteur, Lecteur ou non connecté) : redirection vers la page Contenus `/articles` en vue Explorer.

- **Menu principal (header)**  
  En haut à droite du site, un menu permet d’accéder aux sections suivantes :
  - **Contenus** : liste complète des contenus (`/articles`), avec plusieurs vues (Explorer, Cartes, Tableau).
  - **Mes contenus** : accès rapide aux contenus déposés par l’utilisateur connecté (`/mes-articles`, redirigé pour l’instant vers `/articles?mine=1`).
  - **Relecteurs** : entrée dédiée aux relecteurs/admin (`/relecteurs`, qui renvoie aujourd’hui vers la vue Explorer avec des paramètres spécifiques).

- **Fiche contenu** : `/articles/[id]`
  Affichage du titre, auteur, mutuelle, rubrique, format, date de publication (`datePublication ?? dateDepot ?? createdAt`), état (pour les profils autorisés), chapô, contenu, image (si présente), post RS, lien Google Doc.  
  **Relecteur / Admin** : bouton **« Corriger »** pour passer en mode édition.

### 2.1. Vue Contenus – Explorer / Cartes / Tableau

Sur `/articles`, trois modes d’affichage sont disponibles :

- **Explorer (par défaut)** :  
  - Colonne gauche : liste compacte de cartes (image à gauche, titre, chapô, badges Format/Rubrique, auteur, mutuelle, date de publication).  
  - Colonne droite : panneau de prévisualisation avec le texte complet, le chapô mis en gras, la photo et le post réseaux sociaux.  
  - Sur mobile, la prévisualisation s’ouvre dans un **drawer** (panneau qui remonte depuis le bas).  
  - Raccourcis clavier : flèches haut/bas pour naviguer, Entrée pour ouvrir, Ctrl/⌘+E pour certaines actions.

- **Cartes** :  
  - Grille de cartes avec image pleine hauteur à gauche, titre et chapô à droite, métadonnées auteur / mutuelle / **Publié le** en bas.  
  - Adaptée à une exploration plus visuelle.

- **Tableau** :  
  - Tableau avec colonnes : Photo, Titre, Auteur, Mutuelle, Rubrique, Format, **Publié le**, État, Actions (voir / corriger).  
  - Utile pour les vues de synthèse et le travail de relecture.

### 2.2. Barre de recherche et filtres

En haut de la page `/articles`, une **barre de filtres** commune aux trois vues permet :

- **Recherche texte** (titre, chapô, contenu) avec déclenchement progressif (debounce).  
- **Suggestions dynamiques** : quand on tape, les mutuelles, rubriques et formats correspondants sont proposés sous forme de suggestions ; un clic sur une suggestion active le filtre correspondant.  
- **Facettes multi-sélection** :  
  - Mutuelles, Rubriques, Formats avec compteurs, présentées sous forme de pastilles cliquables.  
  - Possibilité de sélectionner plusieurs valeurs dans chaque catégorie.  
  - Les facettes actives apparaissent aussi dans une ligne dédiée avec une croix pour les retirer rapidement.
- **Filtres de dates** :  
  - Boutons rapides **« Depuis 1 mois »**, **« Depuis 3 mois »**, **« Depuis 6 mois »**.  
  - Période personnalisée (date de début / date de fin).  
  - Le filtrage utilise `datePublication` si elle est renseignée, sinon `createdAt`.
- **Réinitialisation** : un lien **« Réinitialiser tous les filtres »** permet de revenir à un état neutre.

### 2.3. Date affichée dans les listes

Dans toutes les vues de liste (Explorer, Cartes, Tableau) et sur la fiche contenu, la date affichée est :

- Toujours sous la forme **« Publié le JJ/MM/AAAA »**.  
- Calculée avec la règle : `datePublication ?? dateDepot ?? createdAt`, ce qui permet :
  - D’utiliser `dateDepot` comme date de référence pour les contenus importés historiques.
  - D’utiliser `datePublication` pour les contenus validés via le workflow de relecture.
  - De retomber sur `createdAt` si aucune des autres n’est disponible.

---

## 3. Mes contenus

- **URL** : `/mes-articles` (via le menu en haut à droite, libellé "Mes contenus").
- **Comportement actuel** : redirige vers `/articles?mine=1`.  
- **Objectif** : afficher uniquement les contenus dont l’utilisateur connecté est l’auteur (liste filtrée), avec la même ergonomie que la page Contenus (vues Explorer / Cartes / Tableau, filtres, etc.).
  Le filtrage précis `mine=1` sera pleinement opérationnel une fois la gestion des comptes et des permissions finalisée.
- **Voir le contenu** et **Modifier** : ouvrent un **panneau latéral** (sidebar) **sur la même page** (/mes-articles), sans redirection. Le panneau propose deux onglets **Lecture** et **Édition** (type Notion) : clic sur le titre ou « Voir le contenu » ouvre en lecture ; « Modifier » ou « Continuer le brouillon » ouvre en édition. La fiche contenu pleine page reste accessible via **« Ouvrir en pleine page »** dans le panneau (partage, impression, exports).

---

## 4. Nouveau contenu – éditeur riche

- **URL** : `/articles/depot`
- **Accès** : tout utilisateur connecté (en pratique surtout auteurs).

**Deux possibilités :**

1. **Saisie directe avec éditeur riche**  
   - Remplir le formulaire : titre *, chapô, contenu *, auteur *, mutuelle, rubrique, format, légende photo, post RS.  
   - Le contenu principal se fait désormais dans un **éditeur riche type Medium/Gutenberg** :  
     - Paragraphes, titres `H2` / `H3`, listes à puces, citations, liens.  
     - Barre d’outils contextuelle et boutons en haut de l’éditeur (B, I, H2, H3, Liste, Citation).  
   - Le compteur de signes s’affiche si un format avec « signes de référence » est choisi (calcul effectué à partir du texte saisi dans l’éditeur).

2. **Importer un Word**  
   - Cliquer sur **« Importer un Word »**  
   - Choisir un fichier `.docx` (max 10 Mo)  
   - Le titre, le chapô et le contenu sont pré-remplis à partir du document (1er paragraphe court = titre, 2e = chapô, reste = contenu).  
   - Ajuster si besoin puis compléter auteur et autres champs avant de déposer.

Le contenu est créé avec l’état **« À relire »**. Le contenu est stocké à la fois en **HTML** (pour les exports et la consultation) et en **JSON structuré** (pour l’éditeur riche et les évolutions futures).

---

## 5. Relecture et correction (éditeur riche)

Réservé aux rôles **Relecteur** et **Admin**.

- Depuis la **fiche contenu** : cliquer sur **« Corriger »** ouvre désormais directement la **vue Explorer** avec le panneau d’édition à droite (`/articles?view=explorer&article=[id]&back=…`).
- Depuis le menu **Relecteurs** (`/relecteurs` ou `/admin/articles`) : accès à la file de relecture admin, qui utilise le même panneau d’édition intégré.

- **Édition unifiée** :  
  - Il n’existe plus de page d’édition séparée de type `/articles/[id]/edit` : toute l’édition d’un contenu se fait soit :
    - dans le **panneau de relecture admin** (`/admin/articles`),  
    - soit dans la **vue Explorer auteur** (`/articles?view=explorer&article=[id]`), qui réutilise `ArticleEditorCard`.
  - Les boutons **« Modifier » / « Corriger »** dans l’interface ne font plus qu’ouvrir ces panneaux, sans changer de page.

- **Espace relecteurs / admin** : `/admin/articles`  
  - Colonne de gauche : file de contenus filtrable par **état** (Tous, À relire, Corrigé, Validé, Publié) avec badge d’état compact, mutuelle, rubrique, format et âge du contenu.
  - Colonne de droite : panneau de relecture avec :  
    - Titre multi-ligne directement éditable.  
    - Sélecteur d’auteur (liste d’auteurs/mutuelles) modifiable.  
    - Timeline d’états (À relire, Corrigé, Validé, Publié) cliquable pour changer l’état.  
    - Contenu intégral dans le **même éditeur riche** que le dépôt, avec bouton Chapô pour mettre en avant le premier paragraphe.  
    - Bloc « Post réseaux sociaux » dédié, prêt à être copié/collé.  
    - Historique des changements d’état regroupé en bas du panneau.

À chaque changement d’état, une entrée est enregistrée dans l’historique (traçabilité). Les modifications de contenu effectuées par les relecteurs sont sauvegardées dans le même modèle (HTML + JSON), ce qui permet de conserver un historique fiable et de futures évolutions (comparaison avant/après).

---

## 6. Copies et exports (Word / HTML / Texte)

Deux modes principaux de récupération du contenu sont disponibles :

1. **Depuis la vue Explorer** (`/articles`, panneau de droite) :  
   - **Copier HTML** : met dans le presse-papiers un HTML propre (titre, chapô, paragraphes, post RS) prêt à coller dans un CMS ou un éditeur riche.  
   - **Copier texte** : met dans le presse-papiers un texte simple structuré (sans syntaxe Markdown), compatible avec un collage direct dans Google Docs ou Word.  
   - Bouton **« Exporter Word »** : ouvre un téléchargement au format Word-compatible incluant le texte du contenu.

2. **Depuis la fiche contenu** (`/articles/[id]`, via « Ouvrir en pleine page » ou lien direct) :
   - Boutons d’export **TXT**, **HTML** et **Word** restent disponibles :  
     - **TXT** : export texte brut (`.txt`) avec titre, métadonnées, chapô, contenu, post RS.  
     - **HTML** : page HTML simple (`.html`) avec structure de titres et paragraphes.  
     - **Word** : fichier `.doc` (HTML servi avec un type `application/msword`) ouvrable directement dans Microsoft Word ou LibreOffice.  
   - Les fichiers sont téléchargés via l’URL :  
     `/api/articles/[id]/export?format=txt|html|word`.

---

## 7. Commandes projet (rappel)

| Commande | Description |
| -------- | ----------- |
| `npm run dev` | Serveur de développement (localhost:3000) |
| `npm run build` | Build de production |
| `npm run db:generate` | Générer le client Prisma |
| `npm run db:migrate` | Appliquer les migrations |
| `npm run db:seed` | Alimenter les référentiels + comptes de test |
| `npm run test` | Exécuter les tests smoke (Vitest) |

---

## 8. À venir (non encore implémenté)

- **Notifications** : email (accusé dépôt, contenu relu / publié).
- Améliorations UX de l’éditeur de dépôt (à retravailler plus tard).

Pour l’état détaillé des sprints et des tests, voir [SUIVI.md](SUIVI.md).
