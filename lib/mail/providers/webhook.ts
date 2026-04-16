import type { MailPayload, MailProvider } from "../types";

export function createWebhookProvider(webhookUrl: string): MailProvider {
  return {
    name: "webhook",
    async send(payload: MailPayload) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromName: payload.fromName,
          to: payload.to,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
          tags: payload.tags ?? [],
          meta: payload.meta ?? {},
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook mail provider error: ${response.status} ${response.statusText}`
        );
      }
    },
  };
}
