export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  fromName?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
};

export type MailProviderName = "auto" | "noop" | "webhook" | "resend" | "smtp";

export interface MailProvider {
  name: MailProviderName;
  send(payload: MailPayload): Promise<void>;
}
