CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "email_subject" TEXT NOT NULL,
  "email_text" TEXT NOT NULL,
  "email_html" TEXT NOT NULL,
  "in_app_title" TEXT NOT NULL,
  "in_app_body" TEXT NOT NULL,
  "push_title" TEXT NOT NULL,
  "push_body" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationTemplate_event_type_key"
  ON "NotificationTemplate"("event_type");
