ALTER TABLE "UserNotificationPreference"
ADD COLUMN "on_author_actions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "on_own_articles" BOOLEAN NOT NULL DEFAULT true;
