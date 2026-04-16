import nodemailer from "nodemailer";
import type { MailPayload, MailProvider } from "../types";

type SmtpConfig = {
  from: string;
  url?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
};

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveSecure(config: SmtpConfig): boolean {
  if (typeof config.secure === "boolean") return config.secure;
  if (typeof config.port === "number") return config.port === 465;
  return false;
}

function resolveFromAddress(baseFrom: string, fromName?: string): string {
  if (!fromName?.trim()) return baseFrom;
  const extracted = baseFrom.match(/<([^>]+)>/);
  const address = (extracted?.[1] ?? baseFrom).trim();
  return `${fromName.trim()} <${address}>`;
}

export function createSmtpProvider(config: SmtpConfig): MailProvider {
  const transport = hasValue(config.url)
    ? nodemailer.createTransport(config.url)
    : nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: resolveSecure(config),
        auth:
          hasValue(config.user) && hasValue(config.pass)
            ? { user: config.user, pass: config.pass }
            : undefined,
      });

  return {
    name: "smtp",
    async send(payload: MailPayload) {
      await transport.sendMail({
        from: resolveFromAddress(config.from, payload.fromName),
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
    },
  };
}
