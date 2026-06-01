/**
 * Sécurise les tables du schéma public en activant la Row Level Security (RLS).
 *
 * Pourquoi : la clé anon Supabase est publique (embarquée dans le front). Sans RLS,
 * l'API PostgREST (https://<projet>.supabase.co/rest/v1/...) expose lecture/écriture
 * sur toutes les tables. L'app n'utilise PAS le client anon pour les tables
 * (tout passe par Prisma / rôle postgres), donc activer la RLS sans policy = deny-all
 * pour anon/authenticated, tout en laissant Prisma fonctionner (postgres BYPASSRLS).
 *
 * On utilise ENABLE (pas FORCE) : le propriétaire/postgres continue de bypasser la RLS.
 *
 * Usage : npx tsx scripts/secure-rls.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const TABLES = [
  "Article",
  "ArticleBloc",
  "ArticleHistorique",
  "Auteur",
  "Etat",
  "Format",
  "Mutuelle",
  "Notification",
  "NotificationDelivery",
  "NotificationTemplate",
  "PasswordResetToken",
  "PushSubscription",
  "Rubrique",
  "User",
  "UserNotificationPreference",
  "_prisma_migrations",
];

async function main() {
  for (const t of TABLES) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "public"."${t}" ENABLE ROW LEVEL SECURITY;`
    );
    console.log(`RLS activée : ${t}`);
  }
  console.log("\n✅ RLS activée sur toutes les tables (deny-all pour anon/PostgREST).");
  console.log("   Prisma (rôle postgres) continue de fonctionner normalement.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
