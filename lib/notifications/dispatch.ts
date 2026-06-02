import { prisma } from "@/lib/prisma";
import type { ArticleNotificationEvent } from "./article-events";
import {
  defaultNotificationPreferences,
  notificationPreferenceSelect,
} from "./preferences";
import { sendMail } from "@/lib/mail";
import { sendWebPushNotification } from "./web-push";
import { retryWithTimeout } from "./reliability";
import {
  escapeHtml,
  getDefaultNotificationTemplate,
  renderTemplate,
} from "./templates";

type DispatchArticleNotificationEventArgs = {
  event: ArticleNotificationEvent;
};

const MAIL_SENDER_NAME = process.env.MAIL_SENDER_NAME?.trim() || "Constance et Léa";
const DEFAULT_ADMIN_ALERT_EMAIL = "contact@reseaudesediteursderevues.org";

/**
 * Détecte une violation de contrainte d'unicité Prisma (code P2002),
 * utilisée pour rendre la déduplication atomique : on tente la création du
 * `NotificationDelivery` et on ignore l'erreur si la clé `dedupeKey` existe déjà.
 */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Récupère le code HTTP d'une erreur web-push (champ `statusCode` exposé par la
 * lib `web-push`). Sert à détecter les abonnements expirés (404/410) de façon
 * fiable, avec repli sur l'analyse textuelle du message.
 */
function getWebPushStatusCode(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }
  return undefined;
}

function buildAdminSignature(args: {
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
}): string {
  const fullName = `${args.prenom?.trim() || ""} ${args.nom?.trim() || ""}`.trim();
  if (fullName) return fullName;
  if (args.email?.trim()) return args.email.trim();
  return "Constance et Léa";
}

function shouldNotifyForEvent(
  eventType: ArticleNotificationEvent["type"],
  preference: {
    onSubmitted: boolean;
    onCorrections: boolean;
    onPublished: boolean;
  }
): boolean {
  if (eventType === "article.submitted") return preference.onSubmitted;
  if (eventType === "article.corrections_requested_or_resubmitted") {
    return preference.onCorrections;
  }
  if (eventType === "article.published") return preference.onPublished;
  return false;
}

function shouldNotifyForScope(
  scope: "adminArticles" | "authorActions",
  preference: {
    onAuthorActions: boolean;
    onOwnArticles: boolean;
  }
): boolean {
  if (scope === "authorActions") return preference.onAuthorActions;
  return preference.onOwnArticles;
}

function isEventEnabledForScope(
  eventType: ArticleNotificationEvent["type"],
  scope: "adminArticles" | "authorActions",
  preference: {
    onSubmittedOwnArticles: boolean;
    onSubmittedAuthorActions: boolean;
    onCorrectionsOwnArticles: boolean;
    onCorrectionsAuthorActions: boolean;
    onPublishedOwnArticles: boolean;
    onPublishedAuthorActions: boolean;
  }
): boolean {
  if (eventType === "article.submitted") {
    return scope === "authorActions"
      ? preference.onSubmittedAuthorActions
      : preference.onSubmittedOwnArticles;
  }
  if (eventType === "article.corrections_requested_or_resubmitted") {
    return scope === "authorActions"
      ? preference.onCorrectionsAuthorActions
      : preference.onCorrectionsOwnArticles;
  }
  if (eventType === "article.published") {
    return scope === "authorActions"
      ? preference.onPublishedAuthorActions
      : preference.onPublishedOwnArticles;
  }
  return false;
}

function isChannelEnabledForScope(
  channel: "email" | "in_app" | "push",
  scope: "adminArticles" | "authorActions",
  preference: {
    emailOwnArticles: boolean;
    emailAuthorActions: boolean;
    inAppOwnArticles: boolean;
    inAppAuthorActions: boolean;
    browserPushOwnArticles: boolean;
    browserPushAuthorActions: boolean;
  }
): boolean {
  if (channel === "email") {
    return scope === "authorActions"
      ? preference.emailAuthorActions
      : preference.emailOwnArticles;
  }
  if (channel === "in_app") {
    return scope === "authorActions"
      ? preference.inAppAuthorActions
      : preference.inAppOwnArticles;
  }
  return scope === "authorActions"
    ? preference.browserPushAuthorActions
    : preference.browserPushOwnArticles;
}

function resolveInAppScope(eventType: ArticleNotificationEvent["type"]): "adminArticles" | "authorActions" {
  if (
    eventType === "article.submitted" ||
    eventType === "article.corrections_requested_or_resubmitted"
  ) {
    return "authorActions";
  }
  return "adminArticles";
}

function resolveAuthorDisplayName(article: {
  auteur?: { prenom?: string | null; nom?: string | null } | null;
}): string {
  const fullName = `${article.auteur?.prenom || ""} ${article.auteur?.nom || ""}`.trim();
  return fullName || "Auteur";
}

function resolveActionTag(eventType: ArticleNotificationEvent["type"]): string {
  if (eventType === "article.submitted") return "Depot";
  if (eventType === "article.corrections_requested_or_resubmitted") {
    return "Corrections";
  }
  if (eventType === "article.published") return "Publication";
  return "Notification";
}

function buildInAppTitle(args: {
  eventType: ArticleNotificationEvent["type"];
  articleTitle: string;
  authorDisplayName: string;
}): string {
  const actionTag = resolveActionTag(args.eventType);
  return `${actionTag} - ${args.authorDisplayName} - ${args.articleTitle}`;
}

export async function dispatchArticleNotificationEvent(
  args: DispatchArticleNotificationEventArgs
): Promise<void> {
  const { event } = args;
  const adminAlertRecipientEmail =
    process.env.ADMIN_ALERT_EMAIL?.trim() || DEFAULT_ADMIN_ALERT_EMAIL;

  const article = await prisma.article.findUnique({
    where: { id: event.articleId },
    select: {
      id: true,
      titre: true,
      updatedAt: true,
      auteur: {
        select: { id: true, prenom: true, nom: true },
      },
    },
  });
  if (!article) return;
  const transitionKey = article.updatedAt.toISOString();
  const authorDisplayName = resolveAuthorDisplayName(article);

  // Un auteur peut théoriquement être lié à plusieurs comptes User. On rend la
  // sélection déterministe (le compte le plus ancien) plutôt que de dépendre de
  // l'ordre arbitraire de la base. Le schéma Prisma n'est volontairement pas modifié.
  const targetUser = await prisma.user.findFirst({
    where: { auteurId: event.targetAuteurId },
    select: { id: true, email: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  const targetAuteur = await prisma.auteur.findUnique({
    where: { id: event.targetAuteurId },
    select: { prenom: true },
  });

  const baseUrl =
    process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  const articleUrl = baseUrl ? `${baseUrl}/articles/${article.id}` : `/articles/${article.id}`;
  const pushUrl = baseUrl ? `${baseUrl}/articles/${article.id}` : `/articles/${article.id}`;

  const preference = targetUser?.id
    ? await prisma.userNotificationPreference.findUnique({
        where: { userId: targetUser.id },
        select: notificationPreferenceSelect,
      })
    : null;

  const effectivePreference = preference ?? defaultNotificationPreferences;
  const targetInAppScope = resolveInAppScope(event.type);
  const shouldNotifyUser =
    shouldNotifyForEvent(event.type, effectivePreference) &&
    shouldNotifyForScope(targetInAppScope, effectivePreference) &&
    isEventEnabledForScope(event.type, targetInAppScope, effectivePreference);

  const customTemplate = await prisma.notificationTemplate.findUnique({
    where: { eventType: event.type },
    select: {
      emailSubject: true,
      emailText: true,
      emailHtml: true,
      inAppTitle: true,
      inAppBody: true,
      pushTitle: true,
      pushBody: true,
      isActive: true,
    },
  });
  const templateBase = customTemplate?.isActive
    ? {
        eventType: event.type,
        emailSubject: customTemplate.emailSubject,
        emailText: customTemplate.emailText,
        emailHtml: customTemplate.emailHtml,
        inAppTitle: customTemplate.inAppTitle,
        inAppBody: customTemplate.inAppBody,
        pushTitle: customTemplate.pushTitle,
        pushBody: customTemplate.pushBody,
      }
    : getDefaultNotificationTemplate(event.type);

  const actorUser = event.actorUserId
    ? await prisma.user.findUnique({
        where: { id: event.actorUserId },
        select: {
          email: true,
          role: true,
          auteur: {
            select: { prenom: true, nom: true },
          },
        },
      })
    : null;
  const adminSignature =
    actorUser && (actorUser.role === "admin" || actorUser.role === "relecteur")
      ? buildAdminSignature({
          prenom: actorUser.auteur?.prenom,
          nom: actorUser.auteur?.nom,
          email: actorUser.email,
        })
      : "Constance et Léa";
  const templateVars = {
    articleTitle: article.titre,
    articleUrl,
    Prenom: targetAuteur?.prenom || undefined,
    adminSignature,
  };

  if (event.type === "article.submitted") {
    const depositorName = `${article.auteur?.prenom || ""} ${article.auteur?.nom || ""}`.trim();
    const contactSubject = `Article déposé : ${article.titre}`;
    const contactText = [
      `Bonjour,`,
      "",
      `L'article "${article.titre}" vient d'être déposé par ${depositorName || "un auteur"}.`,
      `Lien : ${articleUrl}`,
    ].join("\n");
    const safeTitle = escapeHtml(article.titre);
    const safeDepositor = escapeHtml(depositorName || "un auteur");
    const safeArticleUrl = escapeHtml(articleUrl);
    const contactHtml = `<p>Bonjour,</p><p>L'article "<strong>${safeTitle}</strong>" vient d'être déposé par ${safeDepositor}.</p><p><a href="${safeArticleUrl}">Ouvrir l'article</a></p>`;
    try {
      await retryWithTimeout(
        () =>
          sendMail({
            to: adminAlertRecipientEmail,
            fromName: MAIL_SENDER_NAME,
            subject: contactSubject,
            text: contactText,
            html: contactHtml,
            tags: ["article-submitted", "admin-alert"],
            meta: {
              articleId: article.id,
              eventType: event.type,
              channel: "email_contact",
            },
          }),
        {
          label: "email-contact-submitted",
          retries: 2,
          baseDelayMs: 250,
          timeoutMs: 8000,
        }
      );
    } catch (error) {
      console.error("[notifications] contact admin alert email error", {
        articleId: article.id,
        eventType: event.type,
        recipient: adminAlertRecipientEmail,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (
    targetUser?.id &&
    shouldNotifyUser &&
    effectivePreference.inAppEnabled &&
    isChannelEnabledForScope("in_app", targetInAppScope, effectivePreference)
  ) {
    const dedupeKey = `${event.type}:${event.articleId}:${targetUser.id}:in_app:${transitionKey}`;
    const renderedInAppTitle = renderTemplate(
      templateBase.inAppTitle,
      templateVars
    ).trim();
    const inAppTitle =
      renderedInAppTitle ||
      buildInAppTitle({
        eventType: event.type,
        articleTitle: article.titre,
        authorDisplayName,
      });
    const inAppBody = renderTemplate(templateBase.inAppBody, templateVars);
    // Déduplication atomique : la contrainte @unique sur dedupeKey rejette la
    // seconde transaction concurrente (P2002), qu'on ignore pour éviter le doublon.
    try {
      await prisma.$transaction([
        prisma.notification.create({
          data: {
            userId: targetUser.id,
            type: event.type,
            title: inAppTitle,
            body: inAppBody,
            metadata: {
              articleId: article.id,
              articleTitle: article.titre,
              eventType: event.type,
              scope: targetInAppScope,
            },
          },
        }),
        prisma.notificationDelivery.create({
          data: {
            userId: targetUser.id,
            articleId: article.id,
            eventType: event.type,
            channel: "in_app",
            dedupeKey,
          },
        }),
      ]);
      console.info("[notifications] in-app created", {
        articleId: article.id,
        eventType: event.type,
        userId: targetUser.id,
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }

  if (
    targetUser?.id &&
    shouldNotifyUser &&
    effectivePreference.emailEnabled &&
    isChannelEnabledForScope("email", targetInAppScope, effectivePreference) &&
    targetUser.email
  ) {
    const dedupeKey = `${event.type}:${event.articleId}:${targetUser.id}:email:${transitionKey}`;

    // On "réserve" l'envoi en créant le NotificationDelivery AVANT l'envoi du
    // mail. La contrainte @unique sur dedupeKey garantit l'atomicité : si un
    // autre dispatch a déjà réservé (P2002), on s'arrête sans renvoyer.
    // Conséquence assumée (faute de colonne `status` au schéma) : sémantique
    // at-most-once. Si l'envoi échoue ensuite, le mail n'est pas réémis (pas de
    // doublon) — l'erreur est journalisée pour suivi.
    let reserved = true;
    try {
      await prisma.notificationDelivery.create({
        data: {
          userId: targetUser.id,
          articleId: article.id,
          eventType: event.type,
          channel: "email",
          dedupeKey,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      reserved = false;
    }

    if (reserved) {
      const emailSubject = renderTemplate(templateBase.emailSubject, templateVars);
      const emailText = renderTemplate(templateBase.emailText, templateVars);
      const emailHtml = renderTemplate(templateBase.emailHtml, templateVars, {
        html: true,
      });

      try {
        await retryWithTimeout(
          () =>
            sendMail({
              to: targetUser.email,
              fromName: MAIL_SENDER_NAME,
              subject: emailSubject,
              text: emailText,
              html: emailHtml,
              tags: ["article-notification", event.type],
              meta: {
                articleId: article.id,
                eventType: event.type,
                channel: "email",
              },
            }),
          {
            label: "email-send",
            // Pas de retry : la réservation a déjà eu lieu et `withTimeout` ne
            // peut pas annuler un envoi en cours (cf. reliability.ts). Réessayer
            // risquerait un doublon plutôt qu'un simple échec journalisé.
            retries: 0,
            baseDelayMs: 250,
            timeoutMs: 8000,
          }
        );
        console.info("[notifications] email sent", {
          articleId: article.id,
          eventType: event.type,
          userId: targetUser.id,
        });
      } catch (error) {
        console.error("[notifications] email send error (delivery déjà réservé, pas de renvoi)", {
          articleId: article.id,
          eventType: event.type,
          userId: targetUser.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (
    (event.type === "article.submitted" || event.type === "article.published")
  ) {
    const isSubmission = event.type === "article.submitted";
    const depositorName = `${article.auteur?.prenom || ""} ${article.auteur?.nom || ""}`.trim();
    const adminUsers = await prisma.user.findMany({
      where: { role: "admin" },
      select: {
        id: true,
        // Réutilise la source unique de vérité des préférences (preferences.ts)
        // plutôt que de redupliquer la liste des colonnes ici.
        notificationPreference: {
          select: notificationPreferenceSelect,
        },
      },
    });
    const title = `${resolveActionTag(event.type)} - ${depositorName || "Auteur"} - ${article.titre}`;
    const body = isSubmission
      ? `L'article "${article.titre}" vient d'être déposé par ${depositorName || "un auteur"}.`
      : `L'article "${article.titre}" déposé par ${depositorName || "un auteur"} vient d'être publié.`;

    // Traitement parallèle des admins, avec gestion d'erreur par item.
    await Promise.allSettled(
      adminUsers.map(async (admin) => {
        const adminEffectivePreference =
          admin.notificationPreference ?? defaultNotificationPreferences;
        const shouldNotifyAdmin =
          adminEffectivePreference.inAppEnabled &&
          shouldNotifyForEvent(event.type, adminEffectivePreference) &&
          shouldNotifyForScope("authorActions", adminEffectivePreference) &&
          isEventEnabledForScope(event.type, "authorActions", adminEffectivePreference) &&
          isChannelEnabledForScope("in_app", "authorActions", adminEffectivePreference);
        if (!shouldNotifyAdmin) return;

        const dedupeKey = `${event.type}:${event.articleId}:${admin.id}:in_app_admin_alert:${transitionKey}`;
        // Déduplication atomique via la contrainte @unique (P2002 ignoré).
        try {
          await prisma.$transaction([
            prisma.notification.create({
              data: {
                userId: admin.id,
                type: isSubmission
                  ? "article.submitted.admin_alert"
                  : "article.published.admin_alert",
                title,
                body,
                metadata: {
                  articleId: article.id,
                  articleTitle: article.titre,
                  eventType: event.type,
                  publishedByAuteurId: event.targetAuteurId,
                  scope: "authorActions",
                },
              },
            }),
            prisma.notificationDelivery.create({
              data: {
                userId: admin.id,
                articleId: article.id,
                eventType: event.type,
                channel: "in_app",
                dedupeKey,
              },
            }),
          ]);
        } catch (error) {
          if (!isUniqueConstraintError(error)) {
            console.error("[notifications] admin in-app alert error", {
              articleId: article.id,
              eventType: event.type,
              adminId: admin.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      })
    );
  }

  if (
    targetUser?.id &&
    shouldNotifyUser &&
    effectivePreference.browserPushEnabled &&
    isChannelEnabledForScope("push", targetInAppScope, effectivePreference)
  ) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: targetUser.id },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    const pushPayload = {
      title: renderTemplate(templateBase.pushTitle, templateVars),
      body: renderTemplate(templateBase.pushBody, templateVars),
      url: pushUrl,
    };
    const pushUserId = targetUser.id;
    // Traitement parallèle des abonnements push, avec gestion d'erreur par item.
    await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        const dedupeKey = `${event.type}:${event.articleId}:${pushUserId}:push:${subscription.id}:${transitionKey}`;

        // Réservation idempotente AVANT envoi (cf. canal email) : la contrainte
        // @unique évite tout doublon de notification push sur dispatch concurrent.
        try {
          await prisma.notificationDelivery.create({
            data: {
              userId: pushUserId,
              articleId: article.id,
              eventType: event.type,
              channel: "push",
              dedupeKey,
            },
          });
        } catch (error) {
          if (isUniqueConstraintError(error)) return;
          throw error;
        }

        try {
          await retryWithTimeout(
            () =>
              sendWebPushNotification(
                {
                  endpoint: subscription.endpoint,
                  keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                  },
                },
                pushPayload
              ),
            {
              label: "web-push-send",
              retries: 2,
              baseDelayMs: 250,
              timeoutMs: 6000,
            }
          );
          console.info("[notifications] push sent", {
            articleId: article.id,
            eventType: event.type,
            userId: pushUserId,
            subscriptionId: subscription.id,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          // Abonnement expiré/invalide : on s'appuie sur le statusCode renvoyé
          // par web-push (404 = introuvable, 410 = parti), avec repli sur le texte.
          const statusCode = getWebPushStatusCode(error);
          const isExpired =
            statusCode === 404 ||
            statusCode === 410 ||
            message.includes("410") ||
            message.includes("404");
          if (isExpired) {
            await prisma.pushSubscription.delete({
              where: { id: subscription.id },
            });
          } else {
            console.error("[notifications] sendWebPushNotification error", {
              articleId: article.id,
              eventType: event.type,
              userId: pushUserId,
              subscriptionId: subscription.id,
              error: message,
            });
          }
        }
      })
    );
  }
}
