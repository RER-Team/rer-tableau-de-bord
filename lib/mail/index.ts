import { createNoopProvider } from "./providers/noop";
import { createResendProvider } from "./providers/resend";
import { createSmtpProvider } from "./providers/smtp";
import { createWebhookProvider } from "./providers/webhook";
import type { MailPayload, MailProvider, MailProviderName } from "./types";

let cachedProvider: MailProvider | null = null;
let hasWarnedNoopFallback = false;

type MailConfig = {
  provider: MailProviderName;
  webhookUrl: string;
  resendApiKey: string;
  mailFrom: string;
  smtpUrl: string;
  smtpHost: string;
  smtpPortRaw: string;
  smtpUser: string;
  smtpPass: string;
  smtpSecureRaw: string;
};

function readMailConfig(): MailConfig {
  return {
    provider: ((process.env.MAIL_PROVIDER || "auto").trim().toLowerCase() ||
      "auto") as MailProviderName,
    webhookUrl:
      process.env.MAIL_WEBHOOK_URL?.trim() ||
      process.env.PASSWORD_RESET_WEBHOOK_URL?.trim() ||
      "",
    resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
    mailFrom: process.env.MAIL_FROM?.trim() || "",
    smtpUrl: process.env.SMTP_URL?.trim() || "",
    smtpHost: process.env.SMTP_HOST?.trim() || "",
    smtpPortRaw: process.env.SMTP_PORT?.trim() || "",
    smtpUser: process.env.SMTP_USER?.trim() || "",
    smtpPass: process.env.SMTP_PASS?.trim() || "",
    smtpSecureRaw: process.env.SMTP_SECURE?.trim().toLowerCase() || "",
  };
}

function parseSmtpPort(value: string): number | undefined {
  if (!value) return undefined;
  const port = Number(value);
  if (!Number.isFinite(port) || port <= 0) return undefined;
  return port;
}

function parseSmtpSecure(value: string): boolean | undefined {
  if (!value) return undefined;
  if (value === "1" || value === "true" || value === "yes") return true;
  if (value === "0" || value === "false" || value === "no") return false;
  return undefined;
}

function hasSmtpConfig(config: MailConfig): boolean {
  return Boolean(config.smtpUrl || config.smtpHost);
}

function getSmtpProvider(config: MailConfig): MailProvider {
  if (!config.mailFrom) {
    throw new Error("MAIL_FROM manquant pour MAIL_PROVIDER=smtp");
  }
  if (!hasSmtpConfig(config)) {
    throw new Error("SMTP_URL ou SMTP_HOST manquant pour MAIL_PROVIDER=smtp");
  }
  return createSmtpProvider({
    from: config.mailFrom,
    url: config.smtpUrl || undefined,
    host: config.smtpHost || undefined,
    port: parseSmtpPort(config.smtpPortRaw),
    secure: parseSmtpSecure(config.smtpSecureRaw),
    user: config.smtpUser || undefined,
    pass: config.smtpPass || undefined,
  });
}

function resolveProvider(): MailProvider {
  if (cachedProvider) return cachedProvider;
  const config = readMailConfig();

  if (config.provider === "webhook") {
    if (!config.webhookUrl) {
      throw new Error("MAIL_WEBHOOK_URL manquant pour MAIL_PROVIDER=webhook");
    }
    cachedProvider = createWebhookProvider(config.webhookUrl);
    return cachedProvider;
  }

  if (config.provider === "resend") {
    if (!config.resendApiKey || !config.mailFrom) {
      throw new Error(
        "RESEND_API_KEY ou MAIL_FROM manquant pour MAIL_PROVIDER=resend"
      );
    }
    cachedProvider = createResendProvider({
      apiKey: config.resendApiKey,
      from: config.mailFrom,
    });
    return cachedProvider;
  }

  if (config.provider === "smtp") {
    cachedProvider = getSmtpProvider(config);
    return cachedProvider;
  }

  // auto / noop
  if (config.webhookUrl) {
    cachedProvider = createWebhookProvider(config.webhookUrl);
    return cachedProvider;
  }

  if (config.resendApiKey && config.mailFrom) {
    cachedProvider = createResendProvider({
      apiKey: config.resendApiKey,
      from: config.mailFrom,
    });
    return cachedProvider;
  }

  if (hasSmtpConfig(config) && config.mailFrom) {
    cachedProvider = getSmtpProvider(config);
    return cachedProvider;
  }

  if (!hasWarnedNoopFallback) {
    hasWarnedNoopFallback = true;
    console.warn("[mail] fallback provider noop active", {
      mailProvider: config.provider,
      hasMailFrom: Boolean(config.mailFrom),
      hasWebhookUrl: Boolean(config.webhookUrl),
      hasResendApiKey: Boolean(config.resendApiKey),
      hasSmtpConfig: hasSmtpConfig(config),
    });
  }
  cachedProvider = createNoopProvider();
  return cachedProvider;
}

export function getMailRuntimeDiagnostics(): {
  requestedProvider: MailProviderName;
  resolvedProvider: MailProviderName;
  hasMailFrom: boolean;
  hasWebhookUrl: boolean;
  hasResendApiKey: boolean;
  hasSmtpConfig: boolean;
  smtpHostConfigured: boolean;
  smtpPortConfigured: boolean;
  smtpAuthConfigured: boolean;
} {
  const config = readMailConfig();
  const provider = resolveProvider();
  return {
    requestedProvider: config.provider,
    resolvedProvider: provider.name,
    hasMailFrom: Boolean(config.mailFrom),
    hasWebhookUrl: Boolean(config.webhookUrl),
    hasResendApiKey: Boolean(config.resendApiKey),
    hasSmtpConfig: hasSmtpConfig(config),
    smtpHostConfigured: Boolean(config.smtpHost || config.smtpUrl),
    smtpPortConfigured: Boolean(parseSmtpPort(config.smtpPortRaw)),
    smtpAuthConfigured: Boolean(config.smtpUser && config.smtpPass),
  };
}

export async function sendMail(payload: MailPayload): Promise<void> {
  const provider = resolveProvider();
  await provider.send(payload);
}
