import { prisma } from "@/lib/prisma";
import type { ArticleNotificationEvent } from "./article-events";
import { defaultNotificationPreferences } from "./preferences";
import { sendMail } from "@/lib/mail";
import { sendWebPushNotification } from "./web-push";
import { retryWithTimeout } from "./reliability";
import {
  getDefaultNotificationTemplate,
  renderTemplate,
} from "./templates";

type DispatchArticleNotificationEventArgs = {
  event: ArticleNotificationEvent;
};

const MAIL_SENDER_NAME = process.env.MAIL_SENDER_NAME?.trim() || "Constance et Léa";

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

export async function dispatchArticleNotificationEvent(
  args: DispatchArticleNotificationEventArgs
): Promise<void> {
  const { event } = args;
  const adminAlertRecipientEmail = "contact@reseaudesediteursderevues.org";

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

  const targetUser = await prisma.user.findFirst({
    where: { auteurId: event.targetAuteurId },
    select: { id: true, email: true, role: true },
  });
  if (!targetUser?.id) return;
  const targetAuteur = await prisma.auteur.findUnique({
    where: { id: event.targetAuteurId },
    select: { prenom: true },
  });

  const baseUrl =
    process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  const articleUrl = baseUrl ? `${baseUrl}/articles/${article.id}` : `/articles/${article.id}`;
  const pushUrl = baseUrl ? `${baseUrl}/articles/${article.id}` : `/articles/${article.id}`;

  const preference = await prisma.userNotificationPreference.findUnique({
    where: { userId: targetUser.id },
    select: {
      emailEnabled: true,
      inAppEnabled: true,
      browserPushEnabled: true,
      onSubmitted: true,
      onCorrections: true,
      onPublished: true,
    },
  });

  const effectivePreference = preference ?? defaultNotificationPreferences;
  const shouldNotifyUser = shouldNotifyForEvent(event.type, effectivePreference);

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

  if (
    (event.type === "article.submitted" || event.type === "article.published") &&
    targetUser.role === "auteur"
  ) {
    const depositorName = `${article.auteur?.prenom || ""} ${article.auteur?.nom || ""}`.trim();
    const isSubmission = event.type === "article.submitted";
    const contactSubject = isSubmission
      ? `Article déposé : ${article.titre}`
      : `Article publié : ${article.titre}`;
    const contactText = [
      `Bonjour,`,
      "",
      isSubmission
        ? `L'article "${article.titre}" vient d'être déposé par ${depositorName || "un auteur"}.`
        : `L'article "${article.titre}" déposé par ${depositorName || "un auteur"} vient d'être publié.`,
      `Lien : ${articleUrl}`,
    ].join("\n");
    const contactHtml = isSubmission
      ? `<p>Bonjour,</p><p>L'article "<strong>${article.titre}</strong>" vient d'être déposé par ${depositorName || "un auteur"}.</p><p><a href="${articleUrl}">Ouvrir l'article</a></p>`
      : `<p>Bonjour,</p><p>L'article "<strong>${article.titre}</strong>" déposé par ${depositorName || "un auteur"} vient d'être publié.</p><p><a href="${articleUrl}">Ouvrir l'article</a></p>`;
    try {
      await retryWithTimeout(
        () =>
          sendMail({
            to: adminAlertRecipientEmail,
            fromName: MAIL_SENDER_NAME,
            subject: contactSubject,
            text: contactText,
            html: contactHtml,
            tags: [isSubmission ? "article-submitted" : "article-published", "admin-alert"],
            meta: {
              articleId: article.id,
              eventType: event.type,
              channel: "email_contact",
            },
          }),
        {
          label: "email-contact-published",
          retries: 2,
          baseDelayMs: 250,
          timeoutMs: 8000,
        }
      );
    } catch (error) {
      console.error("[notifications] contact publication email error", error);
    }
  }

  if (shouldNotifyUser && effectivePreference.inAppEnabled) {
    const dedupeKey = `${event.type}:${event.articleId}:${targetUser.id}:in_app:${transitionKey}`;
    const existing = await prisma.notificationDelivery.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });
    if (!existing) {
      const inAppTitle = renderTemplate(templateBase.inAppTitle, templateVars);
      const inAppBody = renderTemplate(templateBase.inAppBody, templateVars);
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
    }
  }

  if (shouldNotifyUser && effectivePreference.emailEnabled && targetUser.email) {
    const dedupeKey = `${event.type}:${event.articleId}:${targetUser.id}:email:${transitionKey}`;
    const existing = await prisma.notificationDelivery.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });

    if (!existing) {
      const emailSubject = renderTemplate(templateBase.emailSubject, templateVars);
      const emailText = renderTemplate(templateBase.emailText, templateVars);
      const emailHtml = renderTemplate(templateBase.emailHtml, templateVars);

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
          retries: 2,
          baseDelayMs: 250,
          timeoutMs: 8000,
        }
      );

      await prisma.notificationDelivery.create({
        data: {
          userId: targetUser.id,
          articleId: article.id,
          eventType: event.type,
          channel: "email",
          dedupeKey,
        },
      });
      console.info("[notifications] email sent", {
        articleId: article.id,
        eventType: event.type,
        userId: targetUser.id,
      });
    }
  }

  if (event.type === "article.published" && targetUser.role === "auteur") {
    const depositorName = `${article.auteur?.prenom || ""} ${article.auteur?.nom || ""}`.trim();
    const adminUsers = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });
    for (const admin of adminUsers) {
      const dedupeKey = `${event.type}:${event.articleId}:${admin.id}:in_app_admin_alert:${transitionKey}`;
      const existing = await prisma.notificationDelivery.findUnique({
        where: { dedupeKey },
        select: { id: true },
      });
      if (existing) continue;

      const title = "Article publié (alerte admin)";
      const body = `L'article "${article.titre}" déposé par ${depositorName || "un auteur"} vient d'être publié.`;
      await prisma.$transaction([
        prisma.notification.create({
          data: {
            userId: admin.id,
            type: "article.published.admin_alert",
            title,
            body,
            metadata: {
              articleId: article.id,
              articleTitle: article.titre,
              eventType: event.type,
              publishedByAuteurId: event.targetAuteurId,
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
    }
  }

  if (shouldNotifyUser && effectivePreference.browserPushEnabled) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: targetUser.id },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    const pushPayload = {
      title: renderTemplate(templateBase.pushTitle, templateVars),
      body: renderTemplate(templateBase.pushBody, templateVars),
      url: pushUrl,
    };
    for (const subscription of subscriptions) {
      const dedupeKey = `${event.type}:${event.articleId}:${targetUser.id}:push:${subscription.id}:${transitionKey}`;
      const existing = await prisma.notificationDelivery.findUnique({
        where: { dedupeKey },
        select: { id: true },
      });
      if (existing) continue;

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
        await prisma.notificationDelivery.create({
          data: {
            userId: targetUser.id,
            articleId: article.id,
            eventType: event.type,
            channel: "push",
            dedupeKey,
          },
        });
        console.info("[notifications] push sent", {
          articleId: article.id,
          eventType: event.type,
          userId: targetUser.id,
          subscriptionId: subscription.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("410") || message.includes("404")) {
          await prisma.pushSubscription.delete({
            where: { id: subscription.id },
          });
        } else {
          console.error("[notifications] sendWebPushNotification error", {
            articleId: article.id,
            eventType: event.type,
            userId: targetUser.id,
            subscriptionId: subscription.id,
            error: message,
          });
        }
      }
    }
  }
}
