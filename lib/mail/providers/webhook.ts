import { createHmac } from "node:crypto";
import type { MailPayload, MailProvider } from "../types";

const WEBHOOK_TIMEOUT_MS = 10000;

/**
 * Authentifie la requête POST sortante vers le webhook mail si un secret est
 * configuré côté environnement :
 * - `MAIL_WEBHOOK_SECRET` => en-tête `Authorization: Bearer <secret>`.
 * - `MAIL_WEBHOOK_SIGNING_SECRET` => signature HMAC-SHA256 du corps,
 *   transmise via `X-Mail-Signature` (format `sha256=<hexdigest>`).
 * Si aucun secret n'est défini, le comportement reste inchangé (non authentifié).
 */
function buildAuthHeaders(body: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const bearerSecret = process.env.MAIL_WEBHOOK_SECRET?.trim();
  if (bearerSecret) {
    headers.Authorization = `Bearer ${bearerSecret}`;
  }
  const signingSecret = process.env.MAIL_WEBHOOK_SIGNING_SECRET?.trim();
  if (signingSecret) {
    const signature = createHmac("sha256", signingSecret)
      .update(body)
      .digest("hex");
    headers["X-Mail-Signature"] = `sha256=${signature}`;
  }
  return headers;
}

export function createWebhookProvider(webhookUrl: string): MailProvider {
  return {
    name: "webhook",
    async send(payload: MailPayload) {
      const body = JSON.stringify({
        fromName: payload.fromName,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        tags: payload.tags ?? [],
        meta: payload.meta ?? {},
      });
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(body),
        },
        body,
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook mail provider error: ${response.status} ${response.statusText}`
        );
      }
    },
  };
}
