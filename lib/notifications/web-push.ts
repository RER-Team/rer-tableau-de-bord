import webpush, { type PushSubscription } from "web-push";

let vapidConfigured = false;

function ensureWebPushConfigured(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_SUBJECT?.trim() || "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function getWebPushPublicKey(): string {
  return process.env.WEB_PUSH_PUBLIC_KEY?.trim() || "";
}

export async function sendWebPushNotification(
  subscription: PushSubscription,
  payload: Record<string, unknown>
): Promise<void> {
  if (!ensureWebPushConfigured()) {
    throw new Error("Web Push VAPID non configure (WEB_PUSH_PUBLIC_KEY/PRIVATE_KEY).");
  }
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
