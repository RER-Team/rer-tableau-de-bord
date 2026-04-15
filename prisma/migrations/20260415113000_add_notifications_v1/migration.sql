-- Notifications V1: preferences, inbox, web push subscriptions, delivery idempotency

CREATE TABLE "UserNotificationPreference" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "email_enabled" BOOLEAN NOT NULL DEFAULT true,
  "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
  "browser_push_enabled" BOOLEAN NOT NULL DEFAULT false,
  "on_submitted" BOOLEAN NOT NULL DEFAULT true,
  "on_corrections" BOOLEAN NOT NULL DEFAULT true,
  "on_published" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserNotificationPreference_user_id_key"
  ON "UserNotificationPreference"("user_id");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_user_id_created_at_idx"
  ON "Notification"("user_id", "created_at");
CREATE INDEX "Notification_user_id_read_at_idx"
  ON "Notification"("user_id", "read_at");

CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key"
  ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_user_id_idx"
  ON "PushSubscription"("user_id");

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "article_id" TEXT,
  "event_type" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDelivery_dedupe_key_key"
  ON "NotificationDelivery"("dedupe_key");
CREATE INDEX "NotificationDelivery_user_id_event_type_idx"
  ON "NotificationDelivery"("user_id", "event_type");

ALTER TABLE "UserNotificationPreference"
  ADD CONSTRAINT "UserNotificationPreference_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushSubscription"
  ADD CONSTRAINT "PushSubscription_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDelivery"
  ADD CONSTRAINT "NotificationDelivery_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
