import { prisma } from "@/lib/prisma";
import type { ArticleNotificationEvent } from "./article-events";
import { defaultNotificationPreferences } from "./preferences";
import { sendMail } from "@/lib/mail";
import { buildArticleNotificationTemplate } from "@/lib/mail/templates/article-notification";
import { sendWebPushNotification } from "./web-push";
import { retryWithTimeout } from "./reliability";

type DispatchArticleNotificationEventArgs = {
  event: ArticleNotificationEvent;
};

function shouldNotifyForEvent(
  eventType: ArticleNotificationEvent["type"],
  preference: {
    onSubmitted: boolean;
    onCorrections: boolean;
    onPublished: boolean;
  }
): boolean {
  if (eventType === "article.submitted") return preference.onSubmitted;
  if (eventType === "article.corrections_requested_or_resubmitted") return preference.onCorrections;
  if (eventType === "article.published") return preference.onPublished;
  return false;
}

function buildInAppCopy(event: ArticleNotificationEvent): { title: string; body: string } {
  if (event.type === "article.submitted") {
    return {
      title: "Article depose",
      body: "Votre article a ete depose et transmis pour relecture.",
    };
  }
  if (event.type === "article.corrections_requested_or_resubmitted") {
    return {
      title: "Mise a jour article",
      body: "Des corrections ont ete prises en compte sur votre article.",
    };
  }
  return {
    title: "Article valide",
    body: "Votre article a ete valide et publie.",
  };
}

function buildPushCopy(event: ArticleNotificationEvent, articleId: string, articleTitle: string) {
  if (event.type === "article.submitted") {
    return {
      title: "Article depose",
      body: `Votre article "${articleTitle}" est en relecture.`,
      url: `/articles/${articleId}`,
    };
  }
  if (event.type === "article.corrections_requested_or_resubmitted") {
    return {
      title: "Article mis a jour",
      body: `Des corrections ont ete enregistrees sur "${articleTitle}".`,
      url: `/articles/${articleId}`,
    };
  }
  return {
    title: "Article publie",
    body: `Votre article "${articleTitle}" est publie.`,
    url: `/articles/${articleId}`,
  };
}

export async function dispatchArticleNotificationEvent(
  args: DispatchArticleNotificationEventArgs
): Promise<void> {
  const { event } = args;
  const timestampBucket = new Date().toISOString().slice(0, 13);

  const article = await prisma.article.findUnique({
    where: { id: event.articleId },
    select: { id: true, titre: true },
  });
  if (!article) return;

  const targetUser = await prisma.user.findFirst({
    where: { auteurId: event.targetAuteurId },
    select: { id: true, email: true },
  });
  if (!targetUser?.id) return;

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
  if (!shouldNotifyForEvent(event.type, effectivePreference)) return;

  if (effectivePreference.inAppEnabled) {
    const dedupeKey = `${event.type}:${event.articleId}:${targetUser.id}:in_app:${timestampBucket}`;
    const existing = await prisma.notificationDelivery.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });
    if (!existing) {
      const copy = buildInAppCopy(event);
      await prisma.$transaction([
        prisma.notification.create({
          data: {
            userId: targetUser.id,
            type: event.type,
            title: copy.title,
            body: `${copy.body} (${article.titre})`,
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

  if (effectivePreference.emailEnabled && targetUser.email) {
    const dedupeKey = `${event.type}:${event.articleId}:${targetUser.id}:email:${timestampBucket}`;
    const existing = await prisma.notificationDelivery.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });

    if (!existing) {
      const baseUrl =
        process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
      const articleUrl = baseUrl
        ? `${baseUrl}/articles/${article.id}`
        : `/articles/${article.id}`;
      const template = buildArticleNotificationTemplate({
        eventType: event.type,
        articleTitle: article.titre,
        articleUrl,
      });

      await retryWithTimeout(
        () =>
          sendMail({
            to: targetUser.email,
            subject: template.subject,
            text: template.text,
            html: template.html,
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

  if (effectivePreference.browserPushEnabled) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: targetUser.id },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    const pushPayload = buildPushCopy(event, article.id, article.titre);
    for (const subscription of subscriptions) {
      const dedupeKey = `${event.type}:${event.articleId}:${targetUser.id}:push:${subscription.id}:${timestampBucket}`;
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
