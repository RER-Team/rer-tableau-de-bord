-- Active la Row Level Security (RLS) sur toutes les tables du schéma public.
--
-- Pourquoi : la clé anon Supabase est publique (embarquée dans le front). Sans RLS,
-- l'API PostgREST (https://<projet>.supabase.co/rest/v1/...) expose lecture et
-- écriture sur toutes les tables. L'app n'utilise pas le client anon pour les
-- tables (tout passe par Prisma) : activer la RLS sans policy revient à tout
-- refuser aux rôles anon et authenticated.
--
-- Remplace le script manuel scripts/secure-rls.ts (supprimé), dont la liste datait du 01/06
-- et oubliait "ArticleConsultation" (créée le 02/06 par 20260602100000).
--
-- ENABLE et non FORCE : Prisma se connecte avec le rôle postgres, propriétaire des
-- tables et BYPASSRLS, qui contourne donc la RLS. FORCE n'apporterait rien ici et
-- risquerait de bloquer l'app si le rôle de connexion change.
--
-- Idempotent : ENABLE est sans effet si la RLS est déjà active. IF EXISTS évite
-- l'échec sur une base où une table n'existerait pas (ex. base fantôme de
-- prisma migrate dev, la migration init étant vide).
--
-- Toute nouvelle table devra recevoir la même instruction dans sa propre migration.

ALTER TABLE IF EXISTS "public"."Mutuelle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."Rubrique" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."Format" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."Etat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."Auteur" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."Article" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."ArticleBloc" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."ArticleHistorique" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."UserNotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."NotificationDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."ArticleConsultation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."NotificationTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
