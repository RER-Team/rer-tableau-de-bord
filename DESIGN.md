---
name: RER — Banque de contenus
description: Banque de contenus mutualisée pour éditeurs de revues de mutuelles
colors:
  rer-blue: "#243B8F"
  rer-orange: "#F1663C"
  app-bg: "#F5F7FA"
  surface: "#FFFFFF"
  editorial-paper: "#F7F3E2"
  ink: "#111827"
  muted: "#4B5563"
  subtle: "#9CA3AF"
  border: "#E5E7EB"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.04em"
rounded:
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  chip-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  chip-filter-active:
    backgroundColor: "{colors.rer-blue}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  button-cta:
    backgroundColor: "{colors.rer-orange}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-action:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.rer-blue}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
---

# Design System: RER — Banque de contenus

## 1. Overview

**Creative North Star: « L'atelier éditorial »**

Un atelier de rédaction calme et lisible, pas un tableau de bord qui se montre.
L'interface est un plan de travail : on y dépose, relit, corrige et exporte des
contenus de revues, et tout doit se lire d'un coup d'œil. La personnalité est
**moderne, chaleureuse, accessible** : sérieuse pour un contexte éditorial et
mutualiste, mais jamais corporate-froide. La chaleur ne vient pas d'un fond
beige « papier » à la mode, mais d'une teinte éditoriale réservée
(`#F7F3E2`), d'une typographie soignée et d'une rédaction humaine.

Le fond réel de travail est un gris-bleu très clair et **froid** (`#F5F7FA`),
posé pour faire ressortir des surfaces blanches nettes. La densité est
maîtrisée : on préfère la hiérarchie (taille + graisse) à l'empilement
d'informations. La couleur est rare et porteuse de sens — l'orange n'apparaît
que sur les actions, le bleu RER que sur la sélection et les états actifs.

Ce système **rejette** explicitement : le SaaS « template » générique (grilles
de cartes identiques, dégradés décoratifs, vocabulaire marketing), le
back-office austère et daté (tableaux gris denses et illisibles), et l'interface
surchargée (trop de couleurs, d'effets, de bruit). Il évite aussi l'excès
« grand public ludique ».

**Key Characteristics:**
- Fond froid clair + surfaces blanches, profondeur par bordure fine plutôt que par ombre.
- Couleur strictement fonctionnelle : orange = action, bleu RER = actif/sélection.
- Une seule famille typographique (Inter), hiérarchie par graisse et taille.
- Lisibilité et état visibles d'abord ; densité au service du travail.

## 2. Colors

Une base neutre froide qui laisse deux signaux de couleur faire tout le travail :
le bleu institutionnel et l'orange d'action.

### Primary
- **Bleu RER** (`#243B8F`) : couleur institutionnelle. Réservée à la
  **sélection et aux états actifs** (chip de filtre active, liens, focus,
  onglet courant). C'est le « tu es ici » de l'interface, pas une couleur de
  remplissage.

### Secondary
- **Orange action** (`#F1663C`) : exclusivement les **actions** — CTA principal
  (« Nouveau contenu »), boutons primaires. Jamais en label, badge ou décor.

### Tertiary
- **Papier éditorial** (`#F7F3E2`) : teinte chaude rare, pour les contextes
  proprement éditoriaux (mise en valeur de contenu, encarts). Porte la
  « chaleur » de la marque sans réchauffer tout le fond.

### Neutral
- **Fond app** (`#F5F7FA`) : fond de travail, gris-bleu très clair et froid.
- **Surface** (`#FFFFFF`) : cartes, panneaux, champs.
- **Encre** (`#111827`) : texte principal.
- **Atténué** (`#4B5563`) : texte secondaire, métadonnées (auteur, date) — assez
  foncé pour rester ≥ 4,5:1 sur fond clair.
- **Discret** (`#9CA3AF`) : texte tertiaire, placeholders, icônes inertes.
- **Bordure** (`#E5E7EB`) : traits, séparateurs, contours de cartes.

### Named Rules
**The Orange-for-Action Rule.** L'orange (`#F1663C`) est interdit partout sauf
sur une action. Pas de label orange, pas de badge orange, pas d'accent
décoratif. Sa rareté est ce qui le rend lisible comme « cliquable ».

**The Blue-Means-Active Rule.** Le bleu RER (`#243B8F`) signifie « actif /
sélectionné / ici ». Si rien n'est sélectionné, il n'apparaît pas en aplat.

## 3. Typography

**Display Font:** Inter (repli system-ui, -apple-system, sans-serif)
**Body Font:** Inter (même famille)
**Label/Mono Font:** Inter (aucune famille distincte)

**Character:** Une seule famille humaniste-géométrique neutre, déclinée en
graisses. La hiérarchie naît du contraste de graisse et de taille, pas d'un
mélange de polices — cohérent avec le refus de l'indécision visuelle.

### Hierarchy
- **Display** (800, 1.5rem / `text-2xl`, ~1.15) : titre d'article en page de
  lecture (`<h1>`). Le plus fort accent typographique.
- **Headline** (600, 1.25rem / `text-xl`, ~1.25) : titres de panneaux et de
  sections (« Liste des contenus », titre dans les panneaux latéraux).
- **Title** (600, 1rem–1.125rem) : titres de cartes/contenus dans les listes.
- **Body** (400, 0.875rem / `text-sm`, 1.5) : corps de texte, chapô, descriptions.
  Viser 65–75ch de longueur de ligne dans les zones de lecture (`prose`).
- **Label** (600, 0.6875rem / `text-[11px]`, +0.04em, MAJUSCULES) : éticettes
  courtes — eyebrows de section, en-têtes de méta, libellés de post RS.

### Named Rules
**The Label-Whisper Rule.** Les MAJUSCULES + interlettrage sont réservés aux
labels courts (≤ 4 mots) en `#4B5563`. Jamais de phrase ni de corps de texte en
capitales.

## 4. Elevation

Système **plat par défaut**. La profondeur vient d'abord d'une **bordure fine**
(`1px #E5E7EB`, souvent en `ring-1`) sur surface blanche, complétée par une
ombre très douce (`shadow-sm`). Les ombres ne sont pas un décor : elles
répondent à un état (survol, sélection).

### Shadow Vocabulary
- **Repos** (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)` / `shadow-sm`) : cartes et
  panneaux au repos, à peine détachés du fond.
- **Survol carte** (`shadow-sm` + `transform: translateY(-1px)` + bascule de
  l'anneau vers `rgba(36,59,143,0.5)`) : retour tactile discret sur les contenus
  cliquables de l'explorateur.

### Named Rules
**The Flat-By-Default Rule.** Les surfaces sont plates au repos : un trait, pas
une ombre portée marquée. Toute élévation visible doit répondre à une
interaction (hover, focus, sélection), jamais « pour faire joli ».

## 5. Components

### Buttons
- **Shape:** coins doux, 8px (`rounded-lg`).
- **Primary (CTA) :** fond **orange** (`#F1663C`), texte blanc, semibold,
  padding ~`8px 16px`, `shadow-sm`. Anneau de focus orange avec offset
  (`focus-visible:ring-2 ring-rer-orange ring-offset-2`). Classe : `.btn-cta`.
- **Action (secondaire) :** fond blanc, **texte bleu RER**, bordure `#E5E7EB`,
  `text-[11px]`, survol `bg-rer-app`. Classe : `.btn-action`.
- **Texte / Danger :** lien bleu RER (`.btn-action-text`) ; destructif en rouge
  (`.btn-action-danger`, `#DC2626`).

### Chips
- **Style :** `inline-flex`, 8px de rayon, `text-xs` medium. Inactif = fond blanc,
  bordure `#E5E7EB`, texte encre, survol `bg-rer-app` (`.chip-filter`).
- **State :** actif = fond **bleu RER**, texte blanc, bordure transparente
  (`.chip-filter--active`). Sert aux filtres Mutuelles / Rubriques / Formats /
  Auteurs / Dates.

### Cards / Containers
- **Corner Style :** cartes de contenu en 16px (`rounded-2xl`) ; panneaux et
  encarts en 12px (`rounded-xl`).
- **Background :** blanc (`#FFFFFF`) sur fond app (`#F5F7FA`).
- **Shadow Strategy :** voir Elevation — `ring-1 ring-rer-border` + `shadow-sm`,
  élévation seulement au survol.
- **Border :** trait `1px #E5E7EB`.
- **Internal Padding :** `12px`–`16px` selon la densité.

### Inputs / Fields
- **Style :** fond blanc, bordure `#E5E7EB`, 8px de rayon.
- **Focus :** bordure et anneau bleu RER (`focus:border-rer-blue focus:ring-1
  focus:ring-rer-blue`).
- **Placeholder :** `#9CA3AF` — surveiller le contraste (viser ≥ 4,5:1).

### Navigation
- **Style :** barre supérieure, liens `text-sm` medium. Onglet actif = bleu RER
  (aplat `bg-rer-blue` texte blanc, ou texte bleu selon le contexte) ; inactifs
  en encre/atténué, survol discret.

### Badges (signature)
Trois familles sémantiques, jamais orange : **Rubrique** (plein, teinté),
**Format** (outline), **État** (sémantique : brouillon / en relecture / publié).
Helpers : `getRubriqueBadgeClasses`, `getFormatBadgeClasses`,
`getEtatBadgeClasses`. Ils portent la lisibilité d'état chère au produit.

## 6. Do's and Don'ts

### Do:
- **Do** réserver l'orange `#F1663C` aux actions (CTA, bouton primaire), et le
  bleu RER `#243B8F` à la sélection / l'état actif.
- **Do** réutiliser les composants documentés (`.chip-filter`, `.btn-action`,
  `.btn-cta`, badges sémantiques) au lieu d'en réinventer.
- **Do** garder les surfaces plates au repos : bordure `1px #E5E7EB` +
  `shadow-sm`, élévation seulement au survol/focus.
- **Do** rendre l'état visible d'un coup d'œil (statut, auteur, mutuelle, date).
- **Do** maintenir le contraste du corps de texte ≥ 4,5:1 (préférer `#4B5563` à
  un gris plus clair pour les métadonnées).
- **Do** fournir une alternative `prefers-reduced-motion` pour toute animation.

### Don't:
- **Don't** livrer un **SaaS « template » générique** : grilles de cartes
  identiques répétées, dégradés décoratifs, vocabulaire marketing.
- **Don't** retomber dans le **back-office austère/daté** : tableaux gris denses
  et illisibles, formulaires bruts.
- **Don't** **surcharger** : trop de couleurs, d'effets ou de bruit visuel.
- **Don't** utiliser de **texte en dégradé** (`background-clip: text`) ni de
  **bordure-accent latérale** (`border-left`/`right` > 1px coloré).
- **Don't** mettre du texte en MAJUSCULES au-delà d'un label court (≤ 4 mots).
- **Don't** abuser des animations « grand public » ni des émojis décoratifs.
