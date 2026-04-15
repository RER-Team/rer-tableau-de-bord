# Déploiement – RER Tableau de bord V2

Ce document décrit comment déployer l’application en production. Les corrections UX de l’éditeur de dépôt pourront être faites plus tard.

---

## 1. Prérequis

- **Base de données** : PostgreSQL (Supabase déjà utilisé en dev).
- **Variables d’environnement** à définir en production :
  - `DATABASE_URL` : URL de connexion PostgreSQL (Supabase ou autre).
  - `NEXTAUTH_SECRET` : secret pour les sessions (générer une valeur longue et aléatoire).
  - `NEXTAUTH_URL` : URL publique de l’app (ex. `https://votre-app.vercel.app`).
  - `MAIL_PROVIDER` : provider d’envoi (`auto`, `webhook`, `resend`, `smtp`, `noop`).
  - `MAIL_WEBHOOK_URL` : endpoint HTTP d’envoi d’e-mails (si provider `webhook`).
  - `MAIL_FROM` : expéditeur (obligatoire pour Resend).
  - `RESEND_API_KEY` : clé API Resend (si provider `resend`).
  - `SMTP_URL` : URL de connexion SMTP complète (optionnelle si `SMTP_HOST`/`SMTP_PORT` fournis).
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` : configuration SMTP détaillée (si provider `smtp`).
  - `PASSWORD_RESET_WEBHOOK_URL` : variable legacy encore supportée (fallback si `MAIL_WEBHOOK_URL` absent).
  - `NEXT_PUBLIC_SUPABASE_URL` : URL du projet Supabase.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé publique Supabase pour le client.
  - `SUPABASE_SERVICE_ROLE_KEY` : clé serveur Supabase nécessaire pour générer les URLs d’upload signées.
  - `SUPABASE_URL` : facultatif si `NEXT_PUBLIC_SUPABASE_URL` est déjà défini, mais recommandé pour homogénéiser la config serveur.
  - `SUPABASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` : nom du bucket de stockage (par défaut `articles`).

Génération d’un `NEXTAUTH_SECRET` :
```bash
openssl rand -base64 32
```

---

## 1.1 Configuration e-mail (providers)

Le système d’e-mail est désormais **provider-agnostique**.

- `MAIL_PROVIDER=auto` (recommandé au départ)  
  - utilise `MAIL_WEBHOOK_URL` si présent, sinon Resend si `RESEND_API_KEY` + `MAIL_FROM` sont présents, sinon SMTP si configuré, sinon `noop`.
- `MAIL_PROVIDER=webhook`  
  - nécessite `MAIL_WEBHOOK_URL`.
- `MAIL_PROVIDER=resend`  
  - nécessite `RESEND_API_KEY` et `MAIL_FROM`.
- `MAIL_PROVIDER=smtp`  
  - nécessite `MAIL_FROM` et :
    - soit `SMTP_URL`,
    - soit `SMTP_HOST` + `SMTP_PORT` (+ optionnel `SMTP_USER`/`SMTP_PASS`, `SMTP_SECURE`).
- `MAIL_PROVIDER=noop`  
  - n’envoie rien (utile local/tests).

Exemple SMTP (variables séparées) :
```bash
MAIL_PROVIDER=smtp
MAIL_FROM="RER <no-reply@votre-domaine.fr>"
SMTP_HOST=smtp.votre-fournisseur.fr
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre_user
SMTP_PASS=votre_mot_de_passe
```

Exemple Resend :
```bash
MAIL_PROVIDER=resend
MAIL_FROM="RER <no-reply@votre-domaine.fr>"
RESEND_API_KEY=re_xxx
```

Exemple webhook :
```bash
MAIL_PROVIDER=webhook
MAIL_WEBHOOK_URL=https://votre-service-mail.local/api/send
```

### 1.2 Prérequis délivrabilité (prod)

Pour maximiser la réception des e-mails de réinitialisation:
- Configurer SPF, DKIM et DMARC sur le domaine de `MAIL_FROM`.
- Utiliser un expéditeur dédié de type `no-reply@...` cohérent avec votre provider.
- Vérifier que l’URL publique (`NEXTAUTH_URL`) pointe bien vers le domaine final pour générer des liens de reset corrects.

---

## 2. Option A : Vercel (recommandé pour Next.js)

1. **Compte** : [vercel.com](https://vercel.com), connexion avec GitHub.
2. **Import** : New Project → importer le repo `pierrevin/rer-tableau-de-bord` (ou le repo utilisé).
3. **Build** :
   - Framework Preset : Next.js.
   - Build Command : `npm run build`. Si Prisma n’est pas appelé automatiquement, utiliser `npx prisma generate && npm run build`, ou ajouter dans `package.json` un script `"postinstall": "prisma generate"`.
   - Output : laisser par défaut.
4. **Variables d’environnement** (Settings → Environment Variables) :
   - `DATABASE_URL` (Production, Preview, Development).
   - `NEXTAUTH_SECRET` (Production, Preview).
   - `NEXTAUTH_URL` = `https://votre-projet.vercel.app` (ajuster après le premier déploiement).
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_STORAGE_BUCKET` (si différent de `articles`)
5. **Migrations** : Vercel ne lance pas les migrations automatiquement. Soit :
   - exécuter en local avant chaque déploiement : `npm run db:migrate` (avec `DATABASE_URL` de prod),  
   - soit ajouter un script de déploiement ou un job qui appelle `prisma migrate deploy` (ex. GitHub Action).
6. **Déployer** : push sur la branche connectée (ex. `main`) déclenche un déploiement.

**Note** : les fichiers uploadés dans `public/uploads` ne sont pas persistés sur Vercel (filesystem éphémère). Pour la prod, il faudra passer par un stockage externe (Supabase Storage, S3, etc.) et adapter `POST /api/upload`.

---

## 3. Option B : Supabase (Hosting + BDD)

- **BDD** : déjà sur Supabase.
- **Hosting** : Supabase propose du hosting (Edge Functions, etc.). Pour une app Next.js complète, on peut :
  - déployer Next.js sur **Vercel** ou **Netlify** et garder Supabase pour PostgreSQL + Auth/Storage,  
  - ou déployer Next.js en **Node** sur un service qui supporte Node (Railway, Render, OVH Web Paas, etc.) et pointer `DATABASE_URL` vers Supabase.

Donc en pratique : BDD Supabase + hébergement Next.js sur Vercel/Railway/Render/OVH.

---

## 4. Option C : OVH (VPS ou Web Paas)

- **VPS** :
  1. Machine Linux (ex. Ubuntu).
  2. Installer Node (LTS), npm, éventuellement PM2.
  3. Cloner le repo, `npm install`, `npx prisma generate`, `npx prisma migrate deploy`.
  4. Configurer les variables d’environnement (fichier ou système).
  5. Build : `npm run build` puis `npm run start` (port 3000) ou utiliser PM2.
  6. Nginx (ou autre) en reverse proxy vers le port de l’app, SSL (Let’s Encrypt).

- **Web Paas** : suivre la doc OVH pour une app Node/Next.js (build + start, variables d’env, migrations à lancer manuellement ou via script).

---

## 5. Checklist avant mise en production

- [ ] `DATABASE_URL` pointe vers la BDD de prod (Supabase ou autre).
- [ ] `NEXTAUTH_URL` = URL réelle de l’app (sans slash final).
- [ ] `NEXTAUTH_SECRET` défini et gardé secret.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` définis.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` défini pour permettre l’upload d’images.
- [ ] Migrations appliquées : `npx prisma migrate deploy`.
- [ ] Seed si besoin (référentiels, premier admin) : `npm run db:seed`.
- [ ] Uploads : prévoir un stockage persistant (Supabase Storage ou S3) et adapter l’API d’upload si nécessaire.

---

## 6. Après déploiement

- Tester : connexion, liste articles, détail, dépôt (si l’éditeur est utilisable), déconnexion.
- Tester aussi le parcours **mot de passe oublié** :
  - `/login` → “Mot de passe oublié ?”,
  - réception du lien de reset,
  - `/reset-password` avec un nouveau mot de passe valide.
- Vérifier la sécurité du flux reset :
  - token valable 60 minutes maximum,
  - réponse API toujours générique (pas de fuite d’existence de compte),
  - throttling actif (20 tentatives / 15 min / IP et 5 tentatives / 15 min / email).
- Vérifier le comportement de session post-reset :
  - la session du navigateur courant est supprimée après succès,
  - une ancienne session JWT n’est plus acceptée par les API protégées.
- Documenter l’URL de prod et les comptes de test dans `docs/SUIVI.md` (Sprint 5).
- Les erreurs UX de l’éditeur de dépôt seront corrigées dans une prochaine itération.
