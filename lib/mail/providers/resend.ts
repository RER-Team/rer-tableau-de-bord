import type { MailPayload, MailProvider } from "../types";
import { resolveFromAddress } from "../from-address";

type ResendConfig = {
  apiKey: string;
  from: string;
};

const RESEND_TIMEOUT_MS = 10000;

export function createResendProvider(config: ResendConfig): MailProvider {
  return {
    name: "resend",
    async send(payload: MailPayload) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resolveFromAddress(config.from, payload.fromName),
          to: payload.to,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
          tags: (payload.tags ?? []).map((value) => ({ name: "tag", value })),
        }),
        signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Resend provider error: ${response.status} ${response.statusText} ${detail}`
        );
      }
    },
  };
}
