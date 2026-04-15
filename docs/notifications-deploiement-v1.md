# Checklist de mise en production - notifications auteurs V1

## Variables d'environnement

- `MAIL_PROVIDER=smtp`
- `MAIL_FROM`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `NEXTAUTH_URL` (ou `NEXT_PUBLIC_APP_URL`)
- `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`

## Base de donnees

- Executer la migration Prisma `20260415113000_add_notifications_v1`.
- Verifier la presence des tables:
  - `UserNotificationPreference`
  - `Notification`
  - `PushSubscription`
  - `NotificationDelivery`

## DNS / email (O2switch)

- Configurer SPF pour le domaine expéditeur.
- Configurer DKIM.
- Configurer DMARC (mode monitoring puis enforcement).

## Verification fonctionnelle

- Depot d'article (`a_relire`) => notification in-app + email + push (si actif).
- Re-soumission/corrections => notification in-app + email + push (si actif).
- Validation/publication (`publie`) => notification in-app + email + push (si actif).
- Preferences utilisateur:
  - switch canal email/in-app/browser
  - switch evenement depot/corrections/publication
- Marquage lu unitaire + marquage lu global.
- Health check ops:
  - `GET /api/notifications/health` (admin/relecteur) pour verifier la configuration SMTP/Web Push.
  - `POST /api/notifications/health` (admin) avec `{ "email": "..." }` pour envoyer un email test SMTP.

## Observabilite

- Verifier logs serveur pour echec d'envoi email/push.
- Verifier idempotence via `NotificationDelivery` (pas de doublons par canal/evenement).
- Confirmer les retries et timeouts en conditions degradees (SMTP lent, endpoint push indisponible).
