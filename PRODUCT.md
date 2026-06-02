# Product

## Register

product

## Users

Trois rôles partageant un même parcours « banque de contenus », membres du
Réseau des Éditeurs de Revues (revues de mutuelles) :

- **Auteurs** — déposent et rédigent les contenus.
- **Relecteurs / éditeurs** — corrigent, valident et exportent.
- **Admins** — pilotent : statistiques, référentiels, utilisateurs, réglages.

Contexte d'usage : travail majoritairement sur desktop (parfois mobile), en
retours fréquents voire quotidiens. Le besoin : trouver, lire, corriger,
valider et exporter du contenu éditorial avec un minimum de friction. Une vue
publique (`/decouvrir`) expose en plus des contenus d'exemple aux visiteurs non
connectés. Les trois rôles comptent à égalité : le parcours commun prime sur
l'optimisation d'un seul profil.

## Product Purpose

Une banque de contenus mutualisée pour les éditeurs de revues de mutuelles :
déposer, relire, corriger, suivre et exporter des articles à travers plusieurs
mutuelles. Le succès = un membre trouve vite le bon contenu, comprend son état
d'un coup d'œil (brouillon, en relecture, publié…) et agit (lire / corriger /
exporter) sans détour ; côté admin, un pilotage clair (stats de consultation,
référentiels, utilisateurs).

## Brand Personality

Moderne, chaleureux, accessible. Une voix claire et humaine, jamais corporate
ni froide. Assez sérieuse pour un contexte éditorial et mutualiste, mais
proche et abordable. La confiance vient de la clarté, pas de l'esbroufe.

## Anti-references

- **SaaS « template » générique** : grilles de cartes identiques, dégradés
  décoratifs, vocabulaire marketing creux.
- **Back-office austère / daté** : tableaux gris, densité illisible, formulaires
  bruts.
- **Interface surchargée** : trop de couleurs, d'effets, de bruit visuel.
- (À éviter aussi : l'excès « grand public ludique » — animations gratuites,
  émojis partout.)

## Design Principles

1. **Clarté d'abord** — la hiérarchie et la lisibilité priment sur la densité ;
   chaque écran rend l'état des choses évident (statut, auteur, mutuelle, date).
2. **L'outil s'efface** — le design sert le travail éditorial quotidien : moins
   de clics, des schémas prévisibles, pas de surprise.
3. **Couleur intentionnelle** — l'orange est réservé aux actions (CTA, primaire),
   le bleu RER à la sélection/état actif ; la couleur porte du sens, pas de la
   décoration.
4. **Cohérence systémique** — réutiliser les composants déjà documentés (chips
   de filtre, badges, `btn-action`, `btn-cta`) plutôt que réinventer.
5. **Robuste et humain** — bases d'accessibilité solides, `reduced-motion`
   respecté, et une rédaction (labels, erreurs, états vides) claire et chaleureuse.

## Accessibility & Inclusion

Base solide plutôt que certification formelle. Viser : contraste conforme
(corps de texte ≥ 4,5:1), accès clavier complet, ARIA sur les contrôles
interactifs, et une alternative `prefers-reduced-motion` pour chaque animation.
Pas d'audit WCAG AA formel ciblé pour l'instant, mais aucune régression
tolérée sur ces bases.
