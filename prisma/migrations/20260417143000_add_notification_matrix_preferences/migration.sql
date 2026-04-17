ALTER TABLE "UserNotificationPreference"
ADD COLUMN "email_own_articles" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "email_author_actions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "in_app_own_articles" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "in_app_author_actions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "browser_push_own_articles" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "browser_push_author_actions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "on_submitted_own_articles" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "on_submitted_author_actions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "on_corrections_own_articles" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "on_corrections_author_actions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "on_published_own_articles" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "on_published_author_actions" BOOLEAN NOT NULL DEFAULT true;
